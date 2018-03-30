/*
	Version: 0.0
	Author: Surin Assawajaroenkoon
*/

SmartNotifier = new function () {
	"use strict";

	var $$ = function (obj) {
		if (typeof obj === "object") {
			return obj;
		}
		return document.getElementById(obj);
	}

	var emptyFunc = function () { };

	var isFunction = function (f) {
		return Boolean(f && {}.toString.call(f) === '[object Function]');
	}

	var isModern = function () { //IE10+, Chrome, Firefox
		return !(IE && IE <= 9);
	}

	var showObject = function (obj) {
		obj = $$(obj);
		if (obj) {
			obj.style.display = 'block';
			obj.style.visibility = 'visible'
		}
	}

	var hideObject = function (obj) {
		obj = $$(obj);
		if (obj) {
			obj.style.display = 'none';
			obj.style.visibility = 'hidden'
		}
	}
	
	var highlightObj = function (obj, color){
		obj = $$(obj);
		if(obj)
			obj.style.backgroundColor = color;
	}
	/*
		list of css class names
	*/
	var elClassList = {
		oldIE: {
			cover: 'notifier-cover',
			loading: {
				popup: 'notifier-loading',
				content: 'notifier-loading-content'
			},
			alert: {
				popup: 'notifier-alert',
				content: 'notifier-alert-content'
			},
			notify: {
				popup: 'notifier-notify',
				content: 'notifier-notify-content'
			},
			confirm: {
				popup: 'notifier-confirm',
				content: 'notifier-confirm-content'
			}
		},
		modern: {
			cover: 'notifier-modern-cover',
			loading: {
				popup: 'notifier-modern-loading',
				content: 'notifier-modern-loading-content'
			},
			alert: {
				popup: 'notifier-modern-alert',
				content: 'notifier-modern-alert-content'
			},
			notify: {
				popup: 'notifier-modern-notify',
				content: 'notifier-modern-notify-content'
			},
			confirm: {
				popup: 'notifier-modern-confirm',
				content: 'notifier-modern-confirm-content'
			}
		},
		init: function () {
			if (isModern()) {
				elClassList = elClassList.modern;
			}
			else {
				elClassList = elClassList.oldIE;
			}
		}
	}
	elClassList.init();
	/*
		alert configs
	*/
	var alert = {
		elPopupConf: {
			OK: "OK",
			OKVisibility: "visible",
			Cancel: "Cancel",
			CancelVisibility: "hidden",
			delay: 1000,
			contentStyle: elClassList.alert.content,
			popupStyle: elClassList.alert.popup,
			clockVisibility: 'hidden'
		},
		strAlertArrayHTML: '',
		clear: function () {
			alert.strAlertArrayHTML = "";
			alert.elPopupConf = {
				OK: "OK",
				OKVisibility: "visible",
				Cancel: "Cancel",
				CancelVisibility: "hidden",
				delay: 1000,
				contentStyle: elClassList.alert.content,
				popupStyle: elClassList.alert.popup,
				clockVisibility: 'hidden'
			}
		}
	}

	var confirm = {
		/*
			allows confirm notification type to work with AsynchronousProcessValidator
		*/
		APV: {
			isWait: false,
			object: null,
			awaitors: {
				count: 0,
				tempKey: null,
				queue: [],
				hasNext: function () {
					return confirm.APV.awaitors.queue.length > 0;
				},
				dequeue: function () {
					return confirm.APV.awaitors.queue.shift();;
				},
				enqueue: function () {
					if (!confirm.APV.isWait) return;
					if (confirm.APV.object) {
						if (!confirm.APV.awaitors.tempKey) {
							confirm.APV.awaitors.tempKey = 'confirm_' + confirm.APV.awaitors.count++
						}
						confirm.APV.object.register(confirm.APV.awaitors.tempKey);
						confirm.APV.awaitors.queue.push(confirm.APV.awaitors.tempKey)
						confirm.APV.awaitors.tempKey = null;
					} else {
						throw new Error('Requires AsynchronousProcessValidator object. See parameters requirement of @waitFor method')
					}
				}
			},
			clear: function () {
				confirm.APV.awaitors.count = 0;
				confirm.APV.awaitors.queue = [];
				confirm.APV.awaitors.tempKey = null;
				confirm.APV.object = null;
				confirm.APV.isWait = false;
			}
		},
		funcDF: {
			OK: emptyFunc,
			Cancel: emptyFunc
		},
		func: {
			OK: emptyFunc,
			Cancel: emptyFunc
		},
		elPopupConf: {
			OK: "OK",
			OKVisibility: "visible",
			Cancel: "Cancel",
			CancelVisibility: "visible",
			contentStyle: elClassList.confirm.content,
			popupStyle: elClassList.confirm.popup,
			clockVisibility: 'hidden'
		},
		clear: function () {
			confirm.APV.clear();
			confirm.func = {
				OK: emptyFunc,
				Cancel: emptyFunc
			}
			confirm.elPopupConf.OK = "OK";
			confirm.elPopupConf.Cancel = "Cancel";
		}
	}
	/*
		buffers to prevent collusion and keeps track of notifying type and their progress events
	*/
	var notify = {
		enq_cnt: 0,
		deq_cnt: 0,
		progress: 0,
		enableProgress: false,
		progressUpdateDelay: null,
		finalize: false,
		queue: [],
		size: function () {
			return notify.queue.length;
		},
		hasNext: function () {
			return notify.queue.length > 0 && !!notify.queue[notify.deq_cnt];
		},
		dequeue: function () {
			var cur = notify.queue[notify.deq_cnt]
			notify.progress = notify.deq_cnt++ * 100 / notify.size();
			return cur;
		},
		enqueue: function (state) {
			notify.queue.push({ count: notify.enq_cnt++ });
		},
		elPopupConf: {
			OK: "",
			OKVisibility: "hidden",
			Cancel: "",
			CancelVisibility: "hidden",
			delay: 1000,
			contentStyle: elClassList.notify.content,
			popupStyle: elClassList.notify.popup,
			clockVisibility: 'visible'
		},
		completionListener: {
			listen: function (watchDog) {
				watchDog = (!watchDog | watchDog == "") ? 'infoArea' : watchDog;
				switch (watchDog) {
					case 'infoArea': //detecting if inner text of infoArea DOM changed.
						$$(watchDog).innerText = "";
						var infoArea;
						var id = window.setInterval(
								function () {
									if (!window.closed) {
										infoArea = $$(watchDog)
										if (infoArea && infoArea.innerText != "") {
											//console.log(infoArea.innerText)
											window.SmartNotifier
												.finalize()
												.setDelay(2000)
												.notify(infoArea.innerText);
											window.clearInterval(id);
										}
									} else {
										window.clearInterval(id);
									}
									//console.log('listening....')
								}, 500
							)
						break;
					default:
				}
			}
		},
		clear: function () {
			notify.queue = [];
			notify.enq_cnt = 0;
			notify.deq_cnt = 0;
			notify.finalize = false;
			notify.progress = 0;
			notify.enableProgress = false;
			notify.progressUpdateDelay = null;
			notify.elPopupConf.delay = 1000;
			notify.elPopupConf.clockVisibility = 'visible';
		}
	}
	/*
		buffers to prevent collusion and keeps track of all notifiers' types including configs, message, events, [confirm] functions to call, and [notify] progress state
	*/
	var register = {
		queue: [],
		toNext: true,
		hasNext: function () {
			return register.queue.length > 0;
		},
		dequeue: function () {
			return register.toNext ? register.queue.shift() : {};
		},
		enqueue: function (cst, msg, epcf, f, ntst) {
			register.queue.push(
				{
					curEvent: cst,
					message: msg,
					elPopupConf: {
						OK: epcf.OK,
						OKVisibility: epcf.OKVisibility,
						Cancel: epcf.Cancel,
						CancelVisibility: epcf.CancelVisibility,
						delay: epcf.delay,
						contentStyle: epcf.contentStyle,
						popupStyle: epcf.popupStyle,
						clockVisibility: epcf.clockVisibility
					},
					functions: f ? f : confirm.funcDF,
					notifyState: { finalize: !!ntst }
				}
			)
		},
		clear: function () {
			register.queue = [];
			register.toNext = true;
		}
	}
	/*
		Notifier event definitions
	*/
	var events = {
		none: 0,
		loading: 1,
		covering: 2,
		alert: 3,
		notify: 4,
		confirm: 5
	}
	/*
		Keeps the notifiers moving until terminated.
	*/
	var controller = {
		intervalID: null,
		run: function () {
			controller.intervalID = window.setInterval(
				function () {
					//console.log('intervalID ' + controller.intervalID);
					if (register.toNext && register.hasNext()) {
						$.build()
					}
				}, (notify.progressUpdateDelay ? notify.progressUpdateDelay : 250)
			);
		}
	}
	/*
		Build li HTML
		listify method can be call multiple times with different objects or arrays
	*/
	var listifier = {
		count: 0,
		lisHTML: [],
		listifyBuild: function (o, isOrder) {
			var a = isOrder ? "<ol>" : "<ul>",
				z = isOrder ? "</ol>" : "</ul>",
				type = {}.toString.call(o),
				ret = ""
			//console.log(type +' ' +o)
			if (type === '[object String]' | type === '[object Number]' | type === '[object Boolean]')
				return o.toString();

			if (type === '[object Array]') {
				o.forEach(function (item) {
					ret += "<li>" + listifier.listifyBuild(item) + "</li>";
				});
			} else if (type === '[object Object]') {
				for (var x in o) {
					ret += "<li>" + x + ': ' + listifier.listifyBuild(o[x]) + "</li>";
				}
			}
			else {
				throw new Error('Requires that the argument is array / object / string / number / boolean type');
			}
			return a + ret + z;
		},
		listify: function (obj, search, isOrder) {
			listifier.lisHTML[listifier.count++] = {
				search: (search && typeof search === 'string') ? search : "",
				html: listifier.listifyBuild(obj, isOrder)
			}
		},
		applyList: function (message) {
			listifier.lisHTML.forEach(function (l) {
				//console.log(l)
				message = message.replace('{{' + l.search + '}}', l.html)
			})
			return message;
		},
		clear: function () {
			listifier.count = 0;
			listifier.lisHTML = []
		}
	};
	/*
		Assisting in replacing all target string
	*/
	var replaceAll = function (str, obj) {
		if (typeof str == 'string' && {}.toString.call(obj) === '[object Object]') {
			for (var x in obj) {
				str = str.replace('{{' + x + '}}', obj[x]);
			}
			return str;
		}
	}

	var $ = {};

	$.elPopup = null;
	$.elCover = null;

	$.OK = "OK";
	$.Cancel = "Cancel";
	$.delay = 1000;

	$.curEvent = events.none;
	$.prevEvent = events.none;

	/*
		create popup HTML structure
	*/
	$.elPopupHTML = {
		value: "",
		get: function () {
			if ($.elPopupHTML.value != '')
				return $.elPopupHTML.value;

			var spinner = '<img id="notifier_clock" src="{{sysPath}}images/please-wait-transparent.gif" style="visibility:{{clockVisibility}}"/>';
			var progressBar = '<div class="notifier-progress-border"><div id="progress" class="notifier-progress-bar" style="background-color:#056713;height:30px;width:{{progress}}%"></div></div>';
			var OKBttn = '<input type="button" id="notifier_ok" value="{{OK}}" onclick="SmartNotifier.onClick(this)" onmouseout="highlightObj(this,\'#003366\')" onmouseover="highlightObj(this,\'#336699\')" class="btn" style="background-color:#003366;color:#fff;float:right;width:100%;min-width:100px;visibility:{{OKVisibility}};">';
			var CancelBttn = '<input type="button" id="notifier_cancel" value="{{Cancel}}" onclick="SmartNotifier.onClick(this)" onmouseout="highlightObj(this, \'#FFFFFF\')" onmouseover="highlightObj(this,\'#eeeeee\')" class="btn" style="float:left;width:100%;margin-right:10px;min-width:100px;visibility:{{CancelVisibility}};">';

			var str = '<table border=0 style="border-collapse:collapse;height:150px;width:100%">';
			str += '<tr><td align="center" colspan=2>' + spinner + '</td></tr>';
			str += '<tr><td colspan=2 id="notifier_content" class="{{contentStyle}}" style="padding:20px;">{{message}}</td></tr>';
			str += '<tr style="background-color:#EEE;height:40px">';
			str += '<td colspan=2 id="notifier_progress_td" style="display:none">' + progressBar + '</td>'
			str += '<td style="width:50%" id="notifier_buttons_td"></td><td><table style="float:right;" border=0 id="notifier_buttons"><tr>';
			str += '<td>' + CancelBttn + '</td>';
			str += '<td>' + OKBttn + '</td>';
			str += '</tr></table></td>'
			str += '</tr>';
			str += '</table>'

			$.elPopupHTML.value = str;
			return str;
		}
	}
	/*
		Create popup element
	*/
	$.createElPopup = function (curr) {
		var str = $.elPopupHTML.get();
		str = replaceAll(str,
			{
				sysPath: sysPath,
				clockVisibility: curr.elPopupConf.clockVisibility,
				contentStyle: curr.elPopupConf.contentStyle,
				message: curr.message,
				progress: notify.progress,
				Cancel: curr.elPopupConf.Cancel,
				OK: curr.elPopupConf.OK,
				CancelVisibility: curr.elPopupConf.CancelVisibility,
				OKVisibility: curr.elPopupConf.OKVisibility
			}
		);

		if (!$$('notifier_popupdiv')) {
			$.elPopup = document.createElement('div');
			$.elPopup.id = 'notifier_popupdiv';
			$.elPopup.style.left = (document.body.scrollWidth / 2) - (275) + 'px';
			document.body.appendChild($.elPopup);
		} else {
			showObject($.elPopup);
		}

		$.elPopup.className = curr.elPopupConf.popupStyle;
		$.elPopup.innerHTML = str;

		if ($.curEvent == events.notify && notify.enableProgress) {
			hideObject('notifier_buttons_td');
			showObject('notifier_progress_td');
		}
	}
	/*
		create cover element
	*/
	$.createElCover = function () {
		if (!$$('notifier_coverdiv')) {
			$.elCover = document.createElement('div');
			$.elCover.id = 'notifier_coverdiv';
			$.elCover.className = elClassList.cover;
			if (!isModern()) {
				$.elCover.style.width = document.body.scrollWidth + 'px';
				$.elCover.style.height = document.body.scrollHeight + 'px';
			}
			document.body.appendChild($.elCover);
		} else {
			//console.log('show cover')
			showObject($.elCover);
			if (!isModern()) {
				$.elCover.style.width = document.body.scrollWidth + 'px';
				$.elCover.style.height = document.body.scrollHeight + 'px';
			}
		}
	}
	/*
		Build notifier
	*/
	$.build = function (alerting) {
		var curr = alerting ? alerting : register.dequeue();
		$.curEvent = curr.curEvent;
		$.createElCover();
		switch ($.curEvent) {
			case events.notify:
				var curNtfy = notify.dequeue();
				//console.log(notify.progressUpdateDelay)
				if ($.prevEvent == events.notify && curNtfy.count > 0) {
					$$('notifier_content').innerHTML = curr.message;
					if (notify.enableProgress)
						$$('progress').style.width = notify.progress + '%';
					if (curr.notifyState.finalize) {
						$$('notifier_clock').style.visibility = 'hidden';
						if (notify.enableProgress)
							$$('progress').style.width = 100 + '%';
						window.setTimeout(
							function () {
								$.terminate(true)
							}, curr.elPopupConf.delay
						);
					}
				} else {
					if (curr.notifyState.finalize) {
						notify.progress = 100;
						curr.elPopupConf.clockVisibility = 'hidden';
						$.createElPopup(curr);
						window.setTimeout(
							function () {
								$.terminate(true)
							}, curr.elPopupConf.delay
						);
					}
					else {
						$.createElPopup(curr);
					}
				}
				break;

			case events.confirm:
				var myCurEvent = $.curEvent;
				if ($.prevEvent == events.notify) {
					$.terminate();
				}
				$.curEvent = myCurEvent;
				$.createElPopup(curr);
				register.toNext = false; // pause flag
				confirm.func.OK = curr.functions.OK;
				confirm.func.Cancel = curr.functions.Cancel;
				break;

			case events.alert:
				$.terminate(true) // Terminates any on going notifiers and build alert
				$.createElPopup(curr);
				break;

			default:
				$.createElPopup(curr);
				register.toNext = false;
		}
		$.prevEvent = $.curEvent;
	}
	/*
		Created cover to main window when open another child window to prevent modification made to the main window.
	*/
	$.covering = function () {
		//console.log('creating cover')
		$.curEvent = events.covering
		$.createElCover();
	}
	/*
		To terminate the cover and call the function to perform some tasks when the child window close
	*/
	$.onWindowClose = function (win, func) {
		if (!win.location) {
			throw new Error("Requires a window object")
		}
		if (!isFunction(func)) {
			func = emptyFunc;
		}
		if (win.addEventListener) {
			win.addEventListener("beforeunload", function () {
				//console.log("none IE onbeforeunload")
				$.terminate();
				func.call();
			})
		} else if (win.attachEvent) {
			win.attachEvent("onbeforeunload", function () {
				//console.log("IE onbeforeunload")
				$.terminate();
				func.call();
			})
		} else {
			win.onbeforeunload = function () {
				//console.log("else beforeunload")
				$.terminate();
				func.call();
			}
		}
	}
	/*
		Show "Please wait" message when entry page is refreshing or calling and the document/window has focus on
	*/
	$.loading = function () {
		function doLoading() {
			var id = setInterval(
					function () {
						//console.log('document.readyState ' + document.readyState)
						if (document.readyState != 'complete') {
							$.curEvent = events.loading;
							$.build({
								curEvent: events.loading,
								message: 'Please Wait...!',
								elPopupConf: {
									OK: "",
									OKVisibility: "hidden",
									Cancel: "",
									CancelVisibility: "hidden",
									delay: 1000,
									contentStyle: elClassList.loading.content,
									popupStyle: elClassList.loading.popup,
									clockVisibility: 'visible'
								}
							})
						} else {
							if ($.curEvent == events.loading)
								$.terminate();
							clearInterval(id)
						}
					}, 250
				)
		}
		if (document.attachEvent) document.attachEvent('onfocusin', doLoading);
		else if (window.addEventListener) window.addEventListener('focus', doLoading);
		else window.onfocus = doLoading;
	}

	$.notify = function (message) {
		notify.elPopupConf.delay = $.delay;
		notify.enqueue();
		register.enqueue(events.notify, message, notify.elPopupConf, null, notify.finalize);
		if (!controller.intervalID) {
			controller.run();
		}
	}

	$.alert = function (message) {
		// alert will response immediately without enqueuing
		alert.elPopupConf.OK = $.OK;
		message = listifier.applyList(message);
		$.build({
			curEvent: events.alert,
			message: message,
			elPopupConf: alert.elPopupConf
		})
	}

	$.confirm = function (message, OK_func, Cancel_func) {
		var functions = {
			OK: isFunction(OK_func) ? OK_func : emptyFunc,
			Cancel: isFunction(Cancel_func) ? Cancel_func : emptyFunc
		}
		message = listifier.applyList(message)
		confirm.elPopupConf.OK = $.OK;
		confirm.elPopupConf.Cancel = $.Cancel;
		register.enqueue(events.confirm, message, confirm.elPopupConf, functions)
		confirm.APV.awaitors.enqueue();

		if (!controller.intervalID) {
			controller.run();
		}
	}
	/*
		hiding element if not in use
	*/
	$.terminate = function (endAllNotifiers) {
		//console.log('terminating')
		$.reset(endAllNotifiers);
		hideObject($.elPopup);
		if ($.curEvent != events.alert && !register.hasNext()) {
			//console.log('hide cover')
			hideObject($.elCover);
		}
	}
	/*
		reset defaults
	*/
	$.reset = function (endAllNotifiers) {
		if ($.curEvent == events.alert) {
			alert.clear();
			endAllNotifiers = true;
		}
		//console.log('endAllNotifiers ' + endAllNotifiers)
		if (!register.hasNext() || endAllNotifiers) {
			register.clear();
			//console.log('cleared register' + register.queue.length)
			window.clearInterval(controller.intervalID);
			controller.intervalID = null;
			endAllNotifiers = true;
		}
		if (!notify.hasNext() || endAllNotifiers) {
			notify.clear();
			//console.log('cleared notify ' + notify.queue.length)
		}
		if (!confirm.APV.awaitors.hasNext() || endAllNotifiers) {
			confirm.APV.clear();
		}
		listifier.clear();
		register.toNext = true;
		confirm.func = {
			OK: emptyFunc,
			Cancel: emptyFunc
		}
		$.prevEvent = events.none;
		if ($.curEvent != events.alert) {
			$.curEvent = events.none;
		}
		$.OK = "OK";
		$.Cancel = "Cancel";
		$.delay = 1000;
	}
	/*
		called by button OK and Cancel
	*/
	$.onClick = function (obj) {
		//console.log($.curEvent)
		if ($.curEvent == events.confirm) {
			if (confirm.APV.awaitors.hasNext()) {
				confirm.APV.object.complete(confirm.APV.awaitors.dequeue());
			}
			if (obj.id == 'notifier_ok') {
				confirm.func.OK.call();
				if ($.curEvent != events.alert) {
					if (notify.hasNext() && register.hasNext()) { // continue with notifying
						register.toNext = true;
					}
				}
			} else {
				confirm.func.Cancel.call();
			}
		}

		if ($.curEvent == events.alert) {
			hideObject($.elCover)
		}
		$.terminate();
	}

	return {
		/**************************************************
			covering
		**************************************************/
		/*
			Create covering event
		*/
		covering: function () { $.covering() },
		/*
			When a child window closed, then do this
				@win		child window
				@func		function to be executed when child window closed
		*/
		onWindowClose: function (win, func) { $.onWindowClose(win, func); return this; },

		/**********************************************
			loading
		**********************************************/
		/*
			Create loading event when starting or refreshing a page.
		*/
		loading: function () { $.loading() },

		/***********************************************
			notify
		************************************************/
		/*
			Create notify event
				@message		message to be displayed
		*/
		notify: function (message) { $.notify(message) },
		/*
			Allows progress bar to be displayed if flag true
		*/
		enableProgress: function () { notify.enableProgress = true; return this; },
		/*
			Specifies the end of notify event
		*/
		finalize: function () { notify.finalize = true; return this; },
		/*
			When progress bar is enabled, how fast the progress bar be updated
				@val		delay value in miliseconds
		*/
		setProgressUpdateDelay: function (val) { notify.progressUpdateDelay = val; return this; },
		/*
			When finalize of notify event is specified, how long will the last notify event stay
				@val		delay value in miliseconds
		*/
		setDelay: function (val) { $.delay = val; return this; },
		/*
			When submission completed, terminate the final notify event
				@watchDog	an object or string identifying object(id) to watch indicating submission completed
		*/
		listenForCompletion: function (watchDog) { notify.completionListener.listen(watchDog); return this; },

		/**********************************************
			alert
		***********************************************/
		/*
			Create an alert event
				@message		message to be displayed
		*/
		alert: function (message) { $.alert(message); },

		/***********************************************
			confirm
		***********************************************/
		/*
			Create a confirm event
				@message		message to be displayed
				@fOK			a function to be called when OK button clicked
				@fCancel		a function to be called when Cancel button clicked
		*/
		confirm: function (message, fOK, fCancel) { $.confirm(message, fOK, fCancel); },
		/*
			Capture event's object when click on button
				@obj		event's object
		*/
		onClick: function (obj) { $.onClick(obj); },
		/*
			Coordinates confirm event with AsynchronousProcessValidator
				@APV		AsynchronousProcessValidator instance
				@key		key to indentify a particular confirm event (optional)
		*/
		waitFor: function (APV, key) { confirm.APV.isWait = true; confirm.APV.object = APV; confirm.APV.awaitors.tempKey = key; return this; },

		/***********************************************
			common
		***********************************************/
		/*
			Terminates an event and reset settings to default
		*/
		terminate: function () { $.terminate() },
		/*
			Changes the Cancel button's text
				@val		the value to overwrite
		*/
		cancelBtn: function (val) { $.Cancel = val; return this; },
		/*
			Changes the OK button's text
				@val		the value to overwrite
		*/
		okBtn: function (val) { $.OK = val; return this; },
		/*
			Converts object or array to order or unorder html list
				@obj		object or array
				@search		key search to be replaced
				@isOrder	flag true if need the list ordered with number (optional)
		*/
		listify: function (obj, search, isOrder) { listifier.listify(obj, search, isOrder); return this; }
	};
}();
