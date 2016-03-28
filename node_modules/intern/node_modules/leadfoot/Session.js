/*global document:false, window:false */
/**
 * @module leadfoot/Session
 */

var AdmZip = require('adm-zip');
var Element = require('./Element');
var findDisplayed = require('./lib/findDisplayed');
var lang = require('dojo/lang');
var Promise = require('dojo/Promise');
var statusCodes = require('./lib/statusCodes');
var storage = require('./lib/storage');
var strategies = require('./lib/strategies');
var util = require('./lib/util');
var waitForDeleted = require('./lib/waitForDeleted');

/**
 * Finds and converts serialised DOM element objects into fully-featured typed Elements.
 *
 * @private
 * @param session The session from which the Element was retrieved.
 * @param value An object or array that may be, or may contain, serialised DOM element objects.
 * @returns The input value, with all serialised DOM element objects converted to typed Elements.
 */
function convertToElements(session, value) {
	// TODO: Unit test elements attached to objects
	function convert(value) {
		if (Array.isArray(value)) {
			value = value.map(convert);
		}
		else if (typeof value === 'object' && value !== null) {
			if (value.ELEMENT) {
				value = new Element(value, session);
			}
			else {
				for (var k in value) {
					value[k] = convert(value[k]);
				}
			}
		}

		return value;
	}

	return convert(value);
}


/**
 * Delegates the HTTP request for a method to the underlying {@link module:leadfoot/Server} object.
 *
 * @private
 * @param {string} method
 * @returns {Promise.<{ sessionId: string, status: number, value: any }>}
 */
function delegateToServer(method) {
	return function (path, requestData, pathParts) {
		path = 'session/' + this._sessionId + (path ? ('/' + path) : '');
		return this._server[method](path, requestData, pathParts).then(returnValue);
	};
}

/**
 * As of Selenium 2.40.0 (March 2014), all drivers incorrectly transmit an UnknownError instead of a
 * JavaScriptError when user code fails to execute correctly. This method corrects this status code, under the
 * assumption that drivers will follow the spec in future.
 *
 * @private
 */
function fixExecuteError(error) {
	if (error.name === 'UnknownError') {
		error.status = 17;
		error.name = statusCodes[error.status][0];
	}

	throw error;
}

function noop() {
	// At least ios-driver 0.6.6 returns an empty object for methods that are supposed to return no value at all,
	// which is not correct
}

/**
 * HTTP cookies are transmitted as semicolon-delimited strings, with a `key=value` pair giving the cookie’s name and
 * value, then additional information about the cookie (expiry, path, domain, etc.) as additional k-v pairs. This
 * method takes an Array describing the parts of a cookie (`target`), and a hash map containing the additional
 * information (`source`), and pushes the properties from the source object onto the target array as properly
 * escaped key-value strings.
 *
 * @private
 * @param {Array} target
 * @param {Object} source
 */
function pushCookieProperties(target, source) {
	Object.keys(source).forEach(function (key) {
		var value = source[key];

		if (key === 'name' || key === 'value' || (key === 'domain' && value === 'http')) {
			return;
		}

		if (typeof value === 'boolean') {
			value && target.push(key);
		}
		// JsonWireProtocol uses the key 'expiry' but JavaScript cookies use the key 'expires'
		else if (key === 'expiry') {
			if (typeof value === 'number') {
				value = new Date(value * 1000);
			}

			if (value instanceof Date) {
				value = Date.toUTCString();
			}

			target.push('expires=' + encodeURIComponent(value));
		}
		else {
			target.push(key + '=' + encodeURIComponent(value));
		}
	});
}

/**
 * Returns the actual response value from the remote environment.
 *
 * @private
 * @param {Object} response JsonWireProtocol response object.
 * @returns {any} The actual response value.
 */
function returnValue(response) {
	return response.value;
}

/* istanbul ignore next */
/**
 * Simulates a keyboard event as it would occur on Safari 7.
 *
 * @private
 * @param {Array.<string>} keys Keys to type.
 */
function simulateKeys(keys) {
	var target = document.activeElement;

	function dispatch(kwArgs) {
		var event = document.createEvent('KeyboardEvent');
		event.initKeyboardEvent(
			kwArgs.type,
			kwArgs.bubbles || true,
			kwArgs.cancelable || false,
			window,
			kwArgs.key || '',
			kwArgs.location || 3,
			kwArgs.modifiers || '',
			kwArgs.repeat || 0,
			kwArgs.locale || ''
		);

		return target.dispatchEvent(event);
	}

	function dispatchInput() {
		var event = document.createEvent('Event');
		event.initEvent('input', true, false);
		return target.dispatchEvent(event);
	}

	keys = Array.prototype.concat.apply([], keys.map(function (keys) {
		return keys.split('');
	}));

	for (var i = 0, j = keys.length; i < j; ++i) {
		var key = keys[i];
		var performDefault = true;

		performDefault = dispatch({ type: 'keydown', cancelable: true, key: key });
		performDefault = performDefault && dispatch({ type: 'keypress', cancelable: true, key: key });

		if (performDefault) {
			if ('value' in target) {
				target.value = target.value.slice(0, target.selectionStart) + key +
					target.value.slice(target.selectionEnd);
				dispatchInput();
			}
			else if (target.isContentEditable) {
				var node = document.createTextNode(key);
				var selection = window.getSelection();
				var range = selection.getRangeAt(0);
				range.deleteContents();
				range.insertNode(node);
				range.setStartAfter(node);
				range.setEndAfter(node);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}

		dispatch({ type: 'keyup', cancelable: true, key: key });
	}
}

/* istanbul ignore next */
/**
 * Simulates a mouse event as it would occur on Safari 7.
 *
 * @private
 * @param {Object} kwArgs Parameters for the mouse event.
 */
function simulateMouse(kwArgs) {
	var position = kwArgs.position;

	function dispatch(kwArgs) {
		var event = document.createEvent('MouseEvents');
		event.initMouseEvent(
			kwArgs.type,
			kwArgs.bubbles || true,
			kwArgs.cancelable || false,
			window,
			kwArgs.detail || 0,
			window.screenX + position.x,
			window.screenY + position.y,
			position.x,
			position.y,
			kwArgs.ctrlKey || false,
			kwArgs.altKey || false,
			kwArgs.shiftKey || false,
			kwArgs.metaKey || false,
			kwArgs.button || 0,
			kwArgs.relatedTarget || null
		);

		return kwArgs.target.dispatchEvent(event);
	}

	function click(target, button, detail) {
		if (!down(target, button)) {
			return false;
		}

		if (!up(target, button)) {
			return false;
		}

		return dispatch({
			button: button,
			cancelable: true,
			detail: detail,
			target: target,
			type: 'click'
		});
	}

	function down(target, button) {
		return dispatch({
			button: button,
			cancelable: true,
			target: target,
			type: 'mousedown'
		});
	}

	function up(target, button) {
		return dispatch({
			button: button,
			cancelable: true,
			target: target,
			type: 'mouseup'
		});
	}

	function move(currentElement, newElement, xOffset, yOffset) {
		if (newElement) {
			var bbox = newElement.getBoundingClientRect();

			if (xOffset == null) {
				xOffset = (bbox.right - bbox.left) * 0.5;
			}

			if (yOffset == null) {
				yOffset = (bbox.bottom - bbox.top) * 0.5;
			}

			position = { x: bbox.left + xOffset, y: bbox.top + yOffset };
		}
		else {
			position.x += xOffset || 0;
			position.y += yOffset || 0;

			newElement = document.elementFromPoint(position.x, position.y);
		}

		if (currentElement !== newElement) {
			dispatch({ type: 'mouseout', target: currentElement, relatedTarget: newElement });
			dispatch({ type: 'mouseleave', target: currentElement, relatedTarget: newElement, bubbles: false });
			dispatch({ type: 'mouseenter', target: newElement, relatedTarget: currentElement, bubbles: false });
			dispatch({ type: 'mouseover', target: newElement, relatedTarget: currentElement });
		}

		dispatch({ type: 'mousemove', target: newElement, bubbles: true });

		return position;
	}

	var target = document.elementFromPoint(position.x, position.y);

	if (kwArgs.action === 'mousemove') {
		return move(target, kwArgs.element, kwArgs.xOffset, kwArgs.yOffset);
	}
	else if (kwArgs.action === 'mousedown') {
		return down(target, kwArgs.button);
	}
	else if (kwArgs.action === 'mouseup') {
		return up(target, kwArgs.button);
	}
	else if (kwArgs.action === 'click') {
		return click(target, kwArgs.button, 0);
	}
	else if (kwArgs.action === 'dblclick') {
		if (!click(target, kwArgs.button, 0)) {
			return false;
		}

		if (!click(target, kwArgs.button, 1)) {
			return false;
		}

		return dispatch({
			type: 'dblclick',
			target: target,
			button: kwArgs.button,
			detail: 2,
			cancelable: true
		});
	}
}

/**
 * A Session represents a connection to a remote environment that can be driven programmatically.
 *
 * @constructor module:leadfoot/Session
 * @param {string} sessionId The ID of the session, as provided by the remote.
 * @param {module:leadfoot/Server} server The server that the session belongs to.
 * @param {Capabilities} capabilities A map of bugs and features that the remote environment exposes.
 */
function Session(sessionId, server, capabilities) {
	this._sessionId = sessionId;
	this._server = server;
	this._capabilities = capabilities;
	this._closedWindows = {};
	this._timeouts = {
		script: Promise.resolve(0),
		implicit: Promise.resolve(0),
		'page load': Promise.resolve(Infinity)
	};
}

/**
 * @lends module:leadfoot/Session#
 */
Session.prototype = {
	constructor: Session,

	_movedToElement: false,
	_lastMousePosition: null,
	_lastAltitude: null,
	_closedWindows: null,

	// TODO: Timeouts are held so that we can fiddle with the implicit wait timeout to add efficient `waitFor`
	// and `waitForDeleted` convenience methods. Technically only the implicit timeout is necessary.
	_timeouts: {},

	/**
	 * Information about the available features and bugs in the remote environment.
	 *
	 * @member {Capabilities} capabilities
	 * @memberOf module:leadfoot/Session#
	 * @readonly
	 */
	get capabilities() {
		return this._capabilities;
	},

	/**
	 * The current session ID.
	 *
	 * @member {string} sessionId
	 * @memberOf module:leadfoot/Session#
	 * @readonly
	 */
	get sessionId() {
		return this._sessionId;
	},

	/**
	 * The Server that the session runs on.
	 *
	 * @member {module:leadfoot/Server} server
	 * @memberOf module:leadfoot/Session#
	 * @readonly
	 */
	get server() {
		return this._server;
	},

	_get: delegateToServer('_get'),
	_post: delegateToServer('_post'),
	_delete: delegateToServer('_delete'),

	/**
	 * Gets the current value of a timeout for the session.
	 *
	 * @param {string} type The type of timeout to retrieve. One of 'script', 'implicit', or 'page load'.
	 * @returns {Promise.<number>} The timeout, in milliseconds.
	 */
	getTimeout: function (type) {
		return this._timeouts[type];
	},

	/**
	 * Sets the value of a timeout for the session.
	 *
	 * @param {string} type
	 * The type of timeout to set. One of 'script', 'implicit', or 'page load'.
	 *
	 * @param {number} ms
	 * The length of time to use for the timeout, in milliseconds. A value of 0 will cause operations to time out
	 * immediately.
	 *
	 * @returns {Promise.<void>}
	 */
	setTimeout: function (type, ms) {
		// Infinity cannot be serialised by JSON
		if (ms === Infinity) {
			// It seems that at least ChromeDriver 2.10 has a limit here that is near the 32-bit signed integer limit,
			// and IEDriverServer 2.42.2 has an even lower limit; 2.33 hours should be infinite enough for testing
			ms = Math.pow(2, 23) - 1;
		}

		var self = this;
		var promise = this._post('timeouts', {
			type: type,
			ms: ms
		}).catch(function (error) {
			// Appium as of April 2014 complains that `timeouts` is unsupported, so try the more specific
			// endpoints if they exist
			if (error.name === 'UnknownCommand') {
				if (type === 'script') {
					return self._post('timeouts/async_script', { ms: ms });
				}
				else if (type === 'implicit') {
					return self._post('timeouts/implicit_wait', { ms: ms });
				}
			}

			throw error;
		}).then(noop);

		this._timeouts[type] = promise.then(function () {
			return ms;
		});

		return promise;
	},

	/**
	 * Gets the identifier for the window that is currently focused.
	 *
	 * @returns {Promise.<string>} A window handle identifier that can be used with other window handling functions.
	 */
	getCurrentWindowHandle: function () {
		var self = this;
		return this._get('window_handle').then(function (name) {
			if (self.capabilities.brokenDeleteWindow && self._closedWindows[name]) {
				var error = new Error();
				error.status = 23;
				error.name = statusCodes[error.status][0];
				error.message = statusCodes[error.status][1];
				throw error;
			}

			return name;
		});
	},

	/**
	 * Gets a list of identifiers for all currently open windows.
	 *
	 * @returns {Promise.<string[]>}
	 */
	getAllWindowHandles: function () {
		var self = this;
		return this._get('window_handles').then(function (names) {
			if (self.capabilities.brokenDeleteWindow) {
				return names.filter(function (name) { return !self._closedWindows[name]; });
			}

			return names;
		});
	},

	/**
	 * Gets the URL that is loaded in the focused window/frame.
	 *
	 * @returns {Promise.<string>}
	 */
	getCurrentUrl: function () {
		return this._get('url');
	},

	/**
	 * Navigates the focused window/frame to a new URL.
	 *
	 * @param {string} url
	 * @returns {Promise.<void>}
	 */
	get: function (url) {
		this._movedToElement = false;

		if (this.capabilities.brokenMouseEvents) {
			this._lastMousePosition = { x: 0, y: 0 };
		}

		return this._post('url', {
			url: url
		}).then(noop);
	},

	/**
	 * Navigates the focused window/frame forward one page using the browser’s navigation history.
	 *
	 * @returns {Promise.<void>}
	 */
	goForward: function () {
		// TODO: SPEC: Seems like this and `back` should return the newly navigated URL.
		return this._post('forward').then(noop);
	},

	/**
	 * Navigates the focused window/frame back one page using the browser’s navigation history.
	 *
	 * @returns {Promise.<void>}
	 */
	goBack: function () {
		return this._post('back').then(noop);
	},

	/**
	 * Reloads the current browser window/frame.
	 *
	 * @returns {Promise.<void>}
	 */
	refresh: function () {
		if (this.capabilities.brokenRefresh) {
			return this.execute('location.reload();');
		}

		return this._post('refresh').then(noop);
	},

	/**
	 * Executes JavaScript code within the focused window/frame. The code should return a value synchronously.
	 *
	 * @see {@link module:leadfoot/Session#executeAsync} to execute code that returns values asynchronously.
	 *
	 * @param {Function|string} script
	 * The code to execute. If a string value is passed, it will be converted to a function on the remote end.
	 *
	 * @param {any[]} args
	 * An array of arguments that will be passed to the executed code. Only values that can be serialised to JSON, plus
	 * {@link module:leadfoot/Element} objects, can be specified as arguments.
	 *
	 * @returns {Promise.<any>}
	 * The value returned by the remote code. Only values that can be serialised to JSON, plus DOM elements, can be
	 * returned.
	 */
	execute: function (script, args) {
		// At least FirefoxDriver 2.40.0 will throw a confusing NullPointerException if args is not an array;
		// provide a friendlier error message to users that accidentally pass a non-array
		if (typeof args !== 'undefined' && !Array.isArray(args)) {
			throw new Error('Arguments passed to execute must be an array');
		}

		return this._post('execute', {
			script: util.toExecuteString(script),
			args: args || []
		}).then(lang.partial(convertToElements, this), fixExecuteError);
	},

	/**
	 * Executes JavaScript code within the focused window/frame. The code must invoke the provided callback in
	 * order to signal that it has completed execution.
	 *
	 * @see {@link module:leadfoot/Session#execute} to execute code that returns values synchronously.
	 * @see {@link module:leadfoot/Session#setExecuteAsyncTimeout} to set the time until an asynchronous script is
	 * considered timed out.
	 *
	 * @param {Function|string} script
	 * The code to execute. If a string value is passed, it will be converted to a function on the remote end.
	 *
	 * @param {any[]} args
	 * An array of arguments that will be passed to the executed code. Only values that can be serialised to JSON, plus
	 * {@link module:leadfoot/Element} objects, can be specified as arguments. In addition to these arguments, a
	 * callback function will always be passed as the final argument to the script. This callback function must be
	 * invoked in order to signal that execution has completed. The return value of the script, if any, should be passed
	 * to this callback function.
	 *
	 * @returns {Promise.<any>}
	 * The value returned by the remote code. Only values that can be serialised to JSON, plus DOM elements, can be
	 * returned.
	 */
	executeAsync: function (script, args) {
		// At least FirefoxDriver 2.40.0 will throw a confusing NullPointerException if args is not an array;
		// provide a friendlier error message to users that accidentally pass a non-array
		if (typeof args !== 'undefined' && !Array.isArray(args)) {
			throw new Error('Arguments passed to executeAsync must be an array');
		}

		return this._post('execute_async', {
			script: util.toExecuteString(script),
			args: args || []
		}).then(lang.partial(convertToElements, this), fixExecuteError);
	},

	/**
	 * Gets a screenshot of the focused window and returns it in PNG format.
	 *
	 * @returns {Promise.<Buffer>} A buffer containing a PNG image.
	 */
	takeScreenshot: function () {
		return this._get('screenshot').then(function (data) {
			/*jshint node:true */
			return new Buffer(data, 'base64');
		});
	},

	/**
	 * Gets a list of input method editor engines available to the remote environment.
	 * As of April 2014, no known remote environments support IME functions.
	 *
	 * @returns {Promise.<string[]>}
	 */
	getAvailableImeEngines: function () {
		return this._get('ime/available_engines');
	},

	/**
	 * Gets the currently active input method editor for the remote environment.
	 * As of April 2014, no known remote environments support IME functions.
	 *
	 * @returns {Promise.<string>}
	 */
	getActiveImeEngine: function () {
		return this._get('ime/active_engine');
	},

	/**
	 * Returns whether or not an input method editor is currently active in the remote environment.
	 * As of April 2014, no known remote environments support IME functions.
	 *
	 * @returns {Promise.<boolean>}
	 */
	isImeActivated: function () {
		return this._get('ime/activated');
	},

	/**
	 * Deactivates any active input method editor in the remote environment.
	 * As of April 2014, no known remote environments support IME functions.
	 *
	 * @returns {Promise.<void>}
	 */
	deactivateIme: function () {
		return this._post('ime/deactivate');
	},

	/**
	 * Activates an input method editor in the remote environment.
	 * As of April 2014, no known remote environments support IME functions.
	 *
	 * @param {string} engine The type of IME to activate.
	 * @returns {Promise.<void>}
	 */
	activateIme: function (engine) {
		return this._post('ime/activate', {
			engine: engine
		});
	},

	/**
	 * Switches the currently focused frame to a new frame.
	 *
	 * @param {string|number|null|Element} id
	 * The frame to switch to. In most environments, a number or string value corresponds to a key in the
	 * `window.frames` object of the currently active frame. If `null`, the topmost (default) frame will be used.
	 * If an Element is provided, it must correspond to a `<frame>` or `<iframe>` element.
	 *
	 * @returns {Promise.<void>}
	 */
	switchToFrame: function (id) {
		return this._post('frame', {
			id: id
		}).then(noop);
	},

	/**
	 * Switches the currently focused window to a new window.
	 *
	 * @param {string} name
	 * The name of the window to switch to. In most environments, this value corresponds to the `window.name`
	 * property of a window; however, this is not the case in mobile environments. In mobile environments, use
	 * {@link module:leadfoot/Session#getAllWindowHandles} to learn what window names can be used.
	 *
	 * @returns {Promise.<void>}
	 */
	switchToWindow: function (name) {
		return this._post('window', {
			name: name
		}).then(noop);
	},

	/**
	 * Switches the currently focused frame to the parent of the currently focused frame.
	 *
	 * @returns {Promise.<void>}
	 */
	switchToParentFrame: function () {
		var self = this;
		return this._post('frame/parent').catch(function (error) {
			// At least FirefoxDriver 2.40.0 does not implement this command, but we can fake it by retrieving
			// the parent frame element using JavaScript and switching to it directly by reference
			// At least Selendroid 0.9.0 also does not support this command, but unfortunately throws an incorrect
			// error so it looks like a fatal error; see https://github.com/selendroid/selendroid/issues/364
			if (error.name === 'UnknownCommand' ||
				(
					self.capabilities.browserName === 'selendroid' &&
					error.message.indexOf('Error occured while communicating with selendroid server') > -1
				)
			) {
				if (self.capabilities.scriptedParentFrameCrashesBrowser) {
					throw error;
				}

				return self.execute('return window.parent.frameElement;').then(function (parent) {
					// TODO: Using `null` if no parent frame was returned keeps the request from being invalid,
					// but may be incorrect and may cause incorrect frame retargeting on certain platforms;
					// At least Selendroid 0.9.0 fails both commands
					return self.switchToFrame(parent || null);
				});
			}

			throw error;
		}).then(noop);
	},

	/**
	 * Closes the currently focused window. In most environments, after the window has been closed, it is necessary
	 * to explicitly switch to whatever window is now focused.
	 *
	 * @returns {Promise.<void>}
	 */
	closeCurrentWindow: function () {
		var self = this;
		return this._delete('window').catch(function (error) {
			// ios-driver 0.6.6-SNAPSHOT April 2014 does not implement close window command
			if (error.name === 'UnknownCommand') {
				return self.getCurrentWindowHandle().then(function (name) {
					return self.execute('window.close();').then(function () {
						if (self.capabilities.brokenDeleteWindow) {
							self._closedWindows[name] = true;
						}
					});
				});
			}

			throw error;
		}).then(noop);
	},

	/**
	 * Sets the dimensions of a window.
	 *
	 * @param {string=} windowHandle
	 * The name of the window to resize. See {@link module:leadfoot/Session#switchToWindow} to learn about valid
	 * window names. Omit this argument to resize the currently focused window.
	 *
	 * @param {number} width
	 * The new width of the window, in CSS pixels.
	 *
	 * @param {number} height
	 * The new height of the window, in CSS pixels.
	 *
	 * @returns {Promise.<void>}
	 */
	setWindowSize: function (windowHandle, width, height) {
		if (typeof height === 'undefined') {
			height = width;
			width = windowHandle;
			windowHandle = 'current';
		}

		return this._post('window/$0/size', {
			width: width,
			height: height
		}, [ windowHandle ]).then(noop);
	},

	/**
	 * Gets the dimensions of a window.
	 *
	 * @param {string=} windowHandle
	 * The name of the window to query. See {@link module:leadfoot/Session#switchToWindow} to learn about valid
	 * window names. Omit this argument to query the currently focused window.
	 *
	 * @returns {Promise.<{ width: number, height: number }>}
	 * An object describing the width and height of the window, in CSS pixels.
	 */
	getWindowSize: function (windowHandle) {
		if (typeof windowHandle === 'undefined') {
			windowHandle = 'current';
		}

		return this._get('window/$0/size', null, [ windowHandle ]);
	},

	/**
	 * Sets the position of a window.
	 *
	 * @param {string=} windowHandle
	 * The name of the window to move. See {@link module:leadfoot/Session#switchToWindow} to learn about valid
	 * window names. Omit this argument to move the currently focused window.
	 *
	 * @param {number} x
	 * The screen x-coordinate to move to, in CSS pixels, relative to the left edge of the primary monitor.
	 *
	 * @param {number} y
	 * The screen y-coordinate to move to, in CSS pixels, relative to the top edge of the primary monitor.
	 *
	 * @returns {Promise.<void>}
	 */
	setWindowPosition: function (windowHandle, x, y) {
		if (typeof y === 'undefined') {
			y = x;
			x = windowHandle;
			windowHandle = 'current';
		}

		return this._post('window/$0/position', {
			x: x,
			y: y
		}, [ windowHandle ]).then(noop);
	},

	/**
	 * Gets the position of a window.
	 *
	 * @param {string=} windowHandle
	 * The name of the window to query. See {@link module:leadfoot/Session#switchToWindow} to learn about valid
	 * window names. Omit this argument to query the currently focused window.
	 *
	 * @returns {Promise.<{ x: number, y: number }>}
	 * An object describing the position of the window, in CSS pixels, relative to the top-left corner of the
	 * primary monitor. If a secondary monitor exists above or to the left of the primary monitor, these values
	 * will be negative.
	 */
	getWindowPosition: function (windowHandle) {
		if (typeof windowHandle === 'undefined') {
			windowHandle = 'current';
		}

		return this._get('window/$0/position', null, [ windowHandle ]).then(function (position) {
			// At least InternetExplorerDriver 2.41.0 on IE9 returns an object containing extra properties
			return { x: position.x, y: position.y };
		});
	},

	/**
	 * Maximises a window according to the platform’s window system behaviour.
	 *
	 * @param {string=} windowHandle
	 * The name of the window to resize. See {@link module:leadfoot/Session#switchToWindow} to learn about valid
	 * window names. Omit this argument to resize the currently focused window.
	 *
	 * @returns {Promise.<void>}
	 */
	maximizeWindow: function (windowHandle) {
		if (typeof windowHandle === 'undefined') {
			windowHandle = 'current';
		}

		return this._post('window/$0/maximize', null, [ windowHandle ]).then(noop);
	},

	/**
	 * Gets all cookies set on the current page.
	 *
	 * @returns {Promise.<WebDriverCookie>}
	 */
	getCookies: function () {
		return this._get('cookie').then(function (cookies) {
			// At least SafariDriver 2.41.0 returns cookies with extra class and hCode properties that should not
			// exist
			return cookies.map(function (badCookie) {
				var cookie = {};
				for (var key in badCookie) {
					if (key === 'name' || key === 'value' || key === 'path' || key === 'domain' ||
						key === 'secure' || key === 'httpOnly' || key === 'expiry'
					) {
						cookie[key] = badCookie[key];
					}
				}

				if (typeof cookie.expiry === 'number') {
					cookie.expiry = new Date(cookie.expiry * 1000);
				}

				return cookie;
			});
		});
	},

	/**
	 * Sets a cookie on the current page.
	 *
	 * @param {WebDriverCookie} cookie
	 * @returns {Promise.<void>}
	 */
	setCookie: function (cookie) {
		var self = this;

		if (typeof cookie.expiry === 'string') {
			cookie.expiry = new Date(cookie.expiry);
		}

		if (cookie.expiry instanceof Date) {
			cookie.expiry = cookie.expiry.valueOf() / 1000;
		}

		return this._post('cookie', {
			cookie: cookie
		}).catch(function (error) {
			// At least ios-driver 0.6.0-SNAPSHOT April 2014 does not know how to set cookies
			if (error.name === 'UnknownCommand') {
				// Per RFC6265 section 4.1.1, cookie names must match `token` (any US-ASCII character except for
				// control characters and separators as defined in RFC2616 section 2.2)
				if (/[^A-Za-z0-9!#$%&'*+.^_`|~-]/.test(cookie.name)) {
					error = new Error();
					error.status = 25;
					error.name = statusCodes[error.status[0]];
					error.message = 'Invalid cookie name';
					throw error;
				}

				if (/[^\u0021\u0023-\u002b\u002d-\u003a\u003c-\u005b\u005d-\u007e]/.test(cookie.value)) {
					error = new Error();
					error.status = 25;
					error.name = statusCodes[error.status[0]];
					error.message = 'Invalid cookie value';
					throw error;
				}

				var cookieToSet = [ cookie.name + '=' + cookie.value ];

				pushCookieProperties(cookieToSet, cookie);

				return self.execute(/* istanbul ignore next */ function (cookie) {
					document.cookie = cookie;
				}, [ cookieToSet.join(';') ]);
			}

			throw error;
		}).then(noop);
	},

	/**
	 * Clears all cookies for the current page.
	 *
	 * @returns {Promise.<void>}
	 */
	clearCookies: function () {
		return this._delete('cookie').then(noop);
	},

	/**
	 * Deletes a cookie on the current page.
	 *
	 * @param {string} name The name of the cookie to delete.
	 * @returns {Promise.<void>}
	 */
	deleteCookie: function (name) {
		if (this.capabilities.brokenDeleteCookie) {
			var self = this;
			return this.getCookies().then(function (cookies) {
				var cookie;
				if (cookies.some(function (value) {
					if (value.name === name) {
						cookie = value;
						return true;
					}
				})) {
					var expiredCookie = [
						cookie.name + '=',
						'expires=Thu, 01 Jan 1970 00:00:00 GMT'
					];

					pushCookieProperties(expiredCookie, cookie);

					return self.execute(/* istanbul ignore next */ function (expiredCookie) {
						document.cookie = expiredCookie + ';domain=' + encodeURIComponent(document.domain);
					}, [ expiredCookie.join(';') ]);
				}
			});
		}

		return this._delete('cookie/$0', null, [ name ]).then(noop);
	},

	/**
	 * Gets the HTML loaded in the focused window/frame. This markup is serialised by the remote environment so
	 * may not exactly match the HTML provided by the Web server.
	 *
	 * @returns {Promise.<string>}
	 */
	getPageSource: function () {
		return this._get('source');
	},

	/**
	 * Gets the title of the focused window/frame.
	 *
	 * @returns {Promise.<string>}
	 */
	getPageTitle: function () {
		return this._get('title');
	},

	/**
	 * Gets the first element from the focused window/frame that matches the given query.
	 *
	 * @see {@link module:leadfoot/Session#setFindTimeout} to set the amount of time it the remote environment
	 * should spend waiting for an element that does not exist at the time of the `find` call before timing
	 * out.
	 *
	 * @param {string} using
	 * The element retrieval strategy to use. One of 'class name', 'css selector', 'id', 'name', 'link text',
	 * 'partial link text', 'tag name', 'xpath'.
	 *
	 * @param {string} value
	 * The strategy-specific value to search for. For example, if `using` is 'id', `value` should be the ID of the
	 * element to retrieve.
	 *
	 * @returns {Promise.<module:leadfoot/Element>}
	 */
	find: function (using, value) {
		var self = this;
		return this._post('element', {
			using: using,
			value: value
		}).then(function (element) {
			return new Element(element, self);
		});
	},

	/**
	 * Gets an array of elements from the focused window/frame that match the given query.
	 *
	 * @param {string} using
	 * The element retrieval strategy to use. See {@link module:leadfoot/Session#find} for options.
	 *
	 * @param {string} value
	 * The strategy-specific value to search for. See {@link module:leadfoot/Session#find} for details.
	 *
	 * @returns {Promise.<module:leadfoot/Element[]>}
	 */
	findAll: function (using, value) {
		var self = this;
		return this._post('elements', {
			using: using,
			value: value
		}).then(function (elements) {
			return elements.map(function (element) {
				return new Element(element, self);
			});
		});
	},

	/**
	 * Gets the currently focused element from the focused window/frame.
	 *
	 * @method
	 * @returns {Promise.<module:leadfoot/Element>}
	 */
	getActiveElement: util.forCommand(function () {
		var self = this;
		return this._get('element/active').then(function (element) {
			if (element) {
				return new Element(element, self);
			}
			// The driver will return `null` if the active element is the body element; for consistency with how
			// the DOM `document.activeElement` property works, we’ll diverge and always return an element
			else {
				return self.execute('return document.activeElement;');
			}
		}, function (error) {
			// At least ChromeDriver 2.9 does not implement this command, but we can fake it by retrieving
			// the active element using JavaScript
			if (error.name === 'UnknownCommand') {
				return self.execute('return document.activeElement;');
			}

			throw error;
		});
	}, { createsContext: true }),

	/**
	 * Types into the focused window/frame/element.
	 *
	 * @param {string|string[]} keys
	 * The text to type in the remote environment. It is possible to type keys that do not have normal character
	 * representations (modifier keys, function keys, etc.) as well as keys that have two different representations
	 * on a typical US-ASCII keyboard (numpad keys); use the values from {@link module:leadfoot/keys} to type these
	 * special characters. Any modifier keys that are activated by this call will persist until they are
	 * deactivated. To deactivate a modifier key, type the same modifier key a second time, or send `\uE000`
	 * ('NULL') to deactivate all currently active modifier keys.
	 *
	 * @returns {Promise.<void>}
	 */
	pressKeys: function (keys) {
		if (!Array.isArray(keys)) {
			keys = [ keys ];
		}

		if (this.capabilities.brokenSendKeys) {
			return this.execute(simulateKeys, [ keys ]);
		}

		return this._post('keys', {
			value: keys
		}).then(noop);
	},

	/**
	 * Gets the current screen orientation.
	 *
	 * @returns {Promise.<string>} Either 'portrait' or 'landscape'.
	 */
	getOrientation: function () {
		return this._get('orientation').then(function (orientation) {
			return orientation.toLowerCase();
		});
	},

	/**
	 * Sets the screen orientation.
	 *
	 * @param {string} orientation Either 'portrait' or 'landscape'.
	 * @returns {Promise.<void>}
	 */
	setOrientation: function (orientation) {
		orientation = orientation.toUpperCase();

		return this._post('orientation', {
			orientation: orientation
		}).then(noop);
	},

	/**
	 * Gets the text displayed in the currently active alert pop-up.
	 *
	 * @returns {Promise.<string>}
	 */
	getAlertText: function () {
		return this._get('alert_text');
	},

	/**
	 * Types into the currently active prompt pop-up.
	 *
	 * @param {string|string[]} text The text to type into the pop-up’s input box.
	 * @returns {Promise.<void>}
	 */
	typeInPrompt: function (text) {
		if (Array.isArray(text)) {
			text = text.join('');
		}

		return this._post('alert_text', {
			text: text
		}).then(noop);
	},

	/**
	 * Accepts an alert, prompt, or confirmation pop-up. Equivalent to clicking the 'OK' button.
	 *
	 * @returns {Promise.<void>}
	 */
	acceptAlert: function () {
		return this._post('accept_alert').then(noop);
	},

	/**
	 * Dismisses an alert, prompt, or confirmation pop-up. Equivalent to clicking the 'OK' button of an alert pop-up
	 * or the 'Cancel' button of a prompt or confirmation pop-up.
	 *
	 * @returns {Promise.<void>}
	 */
	dismissAlert: function () {
		return this._post('dismiss_alert').then(noop);
	},

	/**
	 * Moves the remote environment’s mouse cursor to the specified element or relative position. If the element is
	 * outside of the viewport, the remote driver will attempt to scroll it into view automatically.
	 *
	 * @method
	 * @param {Element=} element
	 * The element to move the mouse to. If x-offset and y-offset are not specified, the mouse will be moved to the
	 * centre of the element.
	 *
	 * @param {number=} xOffset
	 * The x-offset of the cursor, maybe in CSS pixels, relative to the left edge of the specified element’s
	 * bounding client rectangle. If no element is specified, the offset is relative to the previous position of the
	 * mouse, or to the left edge of the page’s root element if the mouse was never moved before.
	 *
	 * @param {number=} yOffset
	 * The y-offset of the cursor, maybe in CSS pixels, relative to the top edge of the specified element’s bounding
	 * client rectangle. If no element is specified, the offset is relative to the previous position of the mouse,
	 * or to the top edge of the page’s root element if the mouse was never moved before.
	 *
	 * @returns {Promise.<void>}
	 */
	moveMouseTo: util.forCommand(function (element, xOffset, yOffset) {
		var self = this;

		if (typeof yOffset === 'undefined' && typeof xOffset !== 'undefined') {
			yOffset = xOffset;
			xOffset = element;
			element = null;
		}

		if (this.capabilities.brokenMouseEvents) {
			return this.execute(simulateMouse, [ {
				action: 'mousemove',
				position: self._lastMousePosition,
				element: element,
				xOffset: xOffset,
				yOffset: yOffset
			} ]).then(function (newPosition) {
				self._lastMousePosition = newPosition;
			});
		}

		if (element) {
			element = element.elementId;
		}
		// If the mouse has not been moved to any element on this page yet, drivers will either throw errors
		// (FirefoxDriver 2.40.0) or silently fail (ChromeDriver 2.9) when trying to move the mouse cursor relative
		// to the "previous" position; in this case, we just assume that the mouse position defaults to the
		// top-left corner of the document
		else if (!this._movedToElement) {
			return this.execute('return document.documentElement;').then(function (element) {
				return self.moveMouseTo(element, xOffset, yOffset);
			});
		}

		return this._post('moveto', {
			element: element,
			xoffset: xOffset,
			yoffset: yOffset
		}).then(function () {
			self._movedToElement = true;
		});
	}, { usesElement: true }),

	/**
	 * Clicks a mouse button at the point where the mouse cursor is currently positioned. This method may fail to
	 * execute with an error if the mouse has not been moved anywhere since the page was loaded.
	 *
	 * @param {number=} button
	 * The button to click. 0 corresponds to the primary mouse button, 1 to the middle mouse button, 2 to the
	 * secondary mouse button. Numbers above 2 correspond to any additional buttons a mouse might provide.
	 *
	 * @returns {Promise.<void>}
	 */
	clickMouseButton: function (button) {
		if (this.capabilities.brokenMouseEvents) {
			return this.execute(simulateMouse, [ {
				action: 'click',
				button: button,
				position: this._lastMousePosition
			} ]).then(noop);
		}

		var self = this;
		return this._post('click', {
			button: button
		}).then(function () {
			// ios-driver 0.6.6-SNAPSHOT April 2014 does not wait until the default action for a click event occurs
			// before returning
			if (self.capabilities.touchEnabled) {
				return util.sleep(300);
			}
		});
	},

	/**
	 * Depresses a mouse button without releasing it.
	 *
	 * @param {number=} button The button to press. See {@link module:leadfoot/Session#click} for available options.
	 * @returns {Promise.<void>}
	 */
	pressMouseButton: function (button) {
		if (this.capabilities.brokenMouseEvents) {
			return this.execute(simulateMouse, [ {
				action: 'mousedown',
				button: button,
				position: this._lastMousePosition
			} ]).then(noop);
		}

		return this._post('buttondown', {
			button: button
		}).then(noop);
	},

	/**
	 * Releases a previously depressed mouse button.
	 *
	 * @param {number=} button The button to press. See {@link module:leadfoot/Session#click} for available options.
	 * @returns {Promise.<void>}
	 */
	releaseMouseButton: function (button) {
		if (this.capabilities.brokenMouseEvents) {
			return this.execute(simulateMouse, [ {
				action: 'mouseup',
				button: button,
				position: this._lastMousePosition
			} ]).then(noop);
		}

		return this._post('buttonup', {
			button: button
		}).then(noop);
	},

	/**
	 * Double-clicks the primary mouse button.
	 *
	 * @returns {Promise.<void>}
	 */
	doubleClick: function () {
		if (this.capabilities.brokenMouseEvents) {
			return this.execute(simulateMouse, [ {
				action: 'dblclick',
				button: 0,
				position: this._lastMousePosition
			} ]).then(noop);
		}
		else if (this.capabilities.brokenDoubleClick) {
			var self = this;
			return this.pressMouseButton().then(function () {
				return self.releaseMouseButton();
			}).then(function () {
				return self._post('doubleclick');
			});
		}

		return this._post('doubleclick').then(noop);
	},

	/**
	 * Taps an element on a touch screen device. If the element is outside of the viewport, the remote driver will
	 * attempt to scroll it into view automatically.
	 *
	 * @method
	 * @param {module:leadfoot/Element} element The element to tap.
	 * @returns {Promise.<void>}
	 */
	tap: util.forCommand(function (element) {
		if (element) {
			element = element.elementId;
		}

		return this._post('touch/click', {
			element: element
		}).then(noop);
	}, { usesElement: true }),

	/**
	 * Depresses a new finger at the given point on a touch screen device without releasing it.
	 *
	 * @param {number} x The screen x-coordinate to press, maybe in device pixels.
	 * @param {number} y The screen y-coordinate to press, maybe in device pixels.
	 * @returns {Promise.<void>}
	 */
	pressFinger: function (x, y) {
		// TODO: If someone specifies the same coordinates as as an existing finger, will it switch the active finger
		// back to that finger instead of adding a new one?
		return this._post('touch/down', {
			x: x,
			y: y
		}).then(noop);
	},

	/**
	 * Releases whatever finger exists at the given point on a touch screen device.
	 *
	 * @param {number} x The screen x-coordinate where a finger is pressed, maybe in device pixels.
	 * @param {number} y The screen y-coordinate where a finger is pressed, maybe in device pixels.
	 * @returns {Promise.<void>}
	 */
	releaseFinger: function (x, y) {
		return this._post('touch/up', {
			x: x,
			y: y
		}).then(noop);
	},

	/**
	 * Moves the last depressed finger to a new point on the touch screen.
	 *
	 * @param {number} x The screen x-coordinate to move to, maybe in device pixels.
	 * @param {number} y The screen y-coordinate to move to, maybe in device pixels.
	 * @returns {Promise.<void>}
	 */
	moveFinger: function (x, y) {
		return this._post('touch/move', {
			x: x,
			y: y
		}).then(noop);
	},

	/**
	 * Scrolls the currently focused window on a touch screen device.
	 *
	 * @method
	 * @param {Element=} element
	 * An element to scroll to. The window will be scrolled so the element is as close to the top-left corner of the
	 * window as possible.
	 *
	 * @param {number=} xOffset
	 * An optional x-offset, relative to the left edge of the element, in CSS pixels. If no element is specified,
	 * the offset is relative to the previous scroll position of the window.
	 *
	 * @param {number=} yOffset
	 * An optional y-offset, relative to the top edge of the element, in CSS pixels. If no element is specified,
	 * the offset is relative to the previous scroll position of the window.
	 *
	 * @returns {Promise.<void>}
	 */
	touchScroll: util.forCommand(function (element, xOffset, yOffset) {
		if (typeof yOffset === 'undefined' && typeof xOffset !== 'undefined') {
			yOffset = xOffset;
			xOffset = element;
			element = undefined;
		}

		if (this.capabilities.brokenTouchScroll) {
			return this.execute(/* istanbul ignore next */ function (element, x, y) {
				var rect = { left: window.scrollX, top: window.scrollY };
				if (element) {
					var bbox = element.getBoundingClientRect();
					rect.left += bbox.left;
					rect.top += bbox.top;
				}

				window.scrollTo(rect.left + x, rect.top + y);
			}, [ element, xOffset, yOffset ]);
		}

		if (element) {
			element = element.elementId;
		}

		// TODO: If using this, please correct for device pixel ratio to ensure consistency
		return this._post('touch/scroll', {
			element: element,
			xoffset: xOffset,
			yoffset: yOffset
		}).then(noop);
	}, { usesElement: true }),

	/**
	 * Performs a double-tap gesture on an element.
	 *
	 * @method
	 * @param {module:leadfoot/Element} element The element to double-tap.
	 * @returns {Promise.<void>}
	 */
	doubleTap: util.forCommand(function (element) {
		if (element) {
			element = element.elementId;
		}

		return this._post('touch/doubleclick', {
			element: element
		}).then(noop);
	}, { usesElement: true }),

	/**
	 * Performs a long-tap gesture on an element.
	 *
	 * @method
	 * @param {module:leadfoot/Element} element The element to long-tap.
	 * @returns {Promise.<void>}
	 */
	longTap: util.forCommand(function (element) {
		if (element) {
			element = element.elementId;
		}

		return this._post('touch/longclick', {
			element: element
		}).then(noop);
	}, { usesElement: true }),

	/**
	 * Flicks a finger. Note that this method is currently badly specified and highly dysfunctional and is only
	 * provided for the sake of completeness.
	 *
	 * @method
	 * @param {module:leadfoot/Element} element The element where the flick should start.
	 * @param {number} xOffset The x-offset in pixels to flick by.
	 * @param {number} yOffset The x-offset in pixels to flick by.
	 * @param {number} speed The speed of the flick, in pixels per *second*. Most human flicks are 100–200ms, so
	 * this value will be higher than expected.
	 * @returns {Promise.<void>}
	 */
	flickFinger: util.forCommand(function (element, xOffset, yOffset, speed) {
		if (typeof speed === 'undefined' && typeof yOffset === 'undefined' && typeof xOffset !== 'undefined') {
			return this._post('touch/flick', {
				xspeed: element,
				yspeed: xOffset
			}).then(noop);
		}

		if (element) {
			element = element.elementId;
		}

		return this._post('touch/flick', {
			element: element,
			xoffset: xOffset,
			yoffset: yOffset,
			speed: speed
		}).then(noop);
	}, { usesElement: true }),

	/**
	 * Gets the current geographical location of the remote environment.
	 *
	 * @returns {Promise.<Geolocation>}
	 * Latitude and longitude are specified using standard WGS84 decimal latitude/longitude. Altitude is specified
	 * as meters above the WGS84 ellipsoid. Not all environments support altitude.
	 */
	getGeolocation: function () {
		var self = this;
		return this._get('location').then(function (location) {
			// ChromeDriver 2.9 ignores altitude being set and then returns 0; to match the Geolocation API
			// specification, we will just pretend that altitude is not supported by the browser at all by
			// changing the value to `null` if it is zero but the last set value was not zero
			if (location.altitude === 0 && self._lastAltitude !== location.altitude) {
				location.altitude = null;
			}

			return location;
		});
	},

	/**
	 * Sets the geographical location of the remote environment.
	 *
	 * @param {Geolocation} location
	 * Latitude and longitude are specified using standard WGS84 decimal latitude/longitude. Altitude is specified
	 * as meters above the WGS84 ellipsoid. Not all environments support altitude.
	 *
	 * @returns {Promise.<void>}
	 */
	setGeolocation: function (location) {
		// TODO: Is it weird that this accepts an object argument? `setCookie` does too, but nothing else does.
		if (location.altitude !== undefined) {
			this._lastAltitude = location.altitude;
		}

		return this._post('location', {
			location: location
		}).then(noop);
	},

	/**
	 * Gets all logs from the remote environment of the given type. The logs in the remote environment are cleared
	 * once they have been retrieved.
	 *
	 * @param {string} type
	 * The type of log entries to retrieve. Available log types differ between remote environments. Use
	 * {@link module:leadfoot/Session#getAvailableLogTypes} to learn what log types are currently available. Not all
	 * environments support all possible log types.
	 *
	 * @returns {Promise.<LogEntry[]>}
	 * An array of log entry objects. Timestamps in log entries are Unix timestamps, in seconds.
	 */
	getLogsFor: function (type) {
		return this._post('log', {
			type: type
		}).then(function (logs) {
			// At least Selendroid 0.9.0 returns logs as an array of strings instead of an array of log objects,
			// which is a spec violation; see https://github.com/selendroid/selendroid/issues/366
			if (logs && typeof logs[0] === 'string') {
				return logs.map(function (log) {
					var logData = /\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/.exec(log);
					if (logData) {
						return {
							timestamp: Date.parse(logData[1]) / 1000,
							level: logData[2],
							message: logData[3]
						};
					}

					return {
						timestamp: NaN,
						level: 'INFO',
						message: log
					};
				});
			}

			return logs;
		});
	},

	/**
	 * Gets the types of logs that are currently available for retrieval from the remote environment.
	 *
	 * @returns {Promise.<string[]>}
	 */
	getAvailableLogTypes: function () {
		if (this.capabilities.fixedLogTypes) {
			return Promise.resolve(this.capabilities.fixedLogTypes);
		}

		return this._get('log/types');
	},

	/**
	 * Gets the current state of the HTML5 application cache for the current page.
	 *
	 * @returns {Promise.<number>}
	 * The cache status. One of 0 (uncached), 1 (cached/idle), 2 (checking), 3 (downloading), 4 (update ready), 5
	 * (obsolete).
	 */
	getApplicationCacheStatus: function () {
		return this._get('application_cache/status');
	},

	/**
	 * Terminates the session. No more commands will be accepted by the remote after this point.
	 *
	 * @returns {Promise.<void>}
	 */
	quit: function () {
		return this._server.deleteSession(this._sessionId).then(noop);
	},

	/**
	 * Uploads a file to a remote Selenium server for use when testing file uploads. This API is not part of the
	 * WebDriver specification and should not be used directly. To send a file to a server that supports file uploads,
	 * use {@link module:leadfoot/Element#type} to type the name of the local file into a file input field and the file
	 * will be transparently transmitted and used by the server.
	 *
	 * @private
	 * @returns {Promise.<string>}
	 */
	_uploadFile: function (filename) {
		var self = this;

		return new Promise(function (resolve) {
			var zip = new AdmZip();
			zip.addLocalFile(filename);
			var data = zip.toBuffer().toString('base64');
			zip = null;

			resolve(self._post('file', { file: data }));
		});
	}
};


/**
 * Gets the list of keys set in local storage for the focused window/frame.
 *
 * @method getLocalStorageKeys
 * @memberOf module:leadfoot/Session#
 * @returns {Promise.<string[]>}
 */

/**
 * Sets a value in local storage for the focused window/frame.
 *
 * @method setLocalStorageItem
 * @memberOf module:leadfoot/Session#
 * @param {string} key The key to set.
 * @param {string} value The value to set.
 * @returns {Promise.<void>}
 */

/**
 * Clears all data in local storage for the focused window/frame.
 *
 * @method clearLocalStorage
 * @memberOf module:leadfoot/Session#
 * @returns {Promise.<void>}
 */

/**
 * Gets a value from local storage for the focused window/frame.
 *
 * @method getLocalStorageItem
 * @memberOf module:leadfoot/Session#
 * @param {string} key The key of the data to get.
 * @returns {Promise.<string>}
 */

/**
 * Deletes a value from local storage for the focused window/frame.
 *
 * @method deleteLocalStorageItem
 * @memberOf module:leadfoot/Session#
 * @param {string} key The key of the data to delete.
 * @returns {Promise.<void>}
 */

/**
 * Gets the number of keys set in local storage for the focused window/frame.
 *
 * @method getLocalStorageLength
 * @memberOf module:leadfoot/Session#
 * @returns {Promise.<number>}
 */
storage.applyTo(Session.prototype, 'local');


/**
 * Gets the list of keys set in session storage for the focused window/frame.
 *
 * @method getSessionStorageKeys
 * @memberOf module:leadfoot/Session#
 * @returns {Promise.<string[]>}
 */

/**
 * Sets a value in session storage for the focused window/frame.
 *
 * @method setSessionStorageItem
 * @memberOf module:leadfoot/Session#
 * @param {string} key The key to set.
 * @param {string} value The value to set.
 * @returns {Promise.<void>}
 */

/**
 * Clears all data in session storage for the focused window/frame.
 *
 * @method clearSessionStorage
 * @memberOf module:leadfoot/Session#
 * @returns {Promise.<void>}
 */

/**
 * Gets a value from session storage for the focused window/frame.
 *
 * @method getSessionStorageItem
 * @memberOf module:leadfoot/Session#
 * @param {string} key The key of the data to get.
 * @returns {Promise.<string>}
 */

/**
 * Deletes a value from session storage for the focused window/frame.
 *
 * @method deleteSessionStorageItem
 * @memberOf module:leadfoot/Session#
 * @param {string} key The key of the data to delete.
 * @returns {Promise.<void>}
 */

/**
 * Gets the number of keys set in session storage for the focused window/frame.
 *
 * @method getSessionStorageLength
 * @memberOf module:leadfoot/Session#
 * @returns {Promise.<number>}
 */
storage.applyTo(Session.prototype, 'session');

// TODO: The rest of this file are "extra" interfaces; decide where they go more permanently
/**
 * Gets the first element in the currently active window/frame matching the given CSS class name.
 *
 * @method findByClassName
 * @memberOf module:leadfoot/Session#
 * @param {string} className The CSS class name to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element in the currently active window/frame matching the given CSS selector.
 *
 * @method findByCssSelector
 * @memberOf module:leadfoot/Session#
 * @param {string} selector The CSS selector to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element in the currently active window/frame matching the given ID.
 *
 * @method findById
 * @memberOf module:leadfoot/Session#
 * @param {string} id The ID of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element in the currently active window/frame matching the given name attribute.
 *
 * @method findByName
 * @memberOf module:leadfoot/Session#
 * @param {string} name The name of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element in the currently active window/frame matching the given case-insensitive link text.
 *
 * @method findByLinkText
 * @memberOf module:leadfoot/Session#
 * @param {string} text The link text of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element in the currently active window/frame partially matching the given case-insensitive
 * link text.
 *
 * @method findByPartialLinkText
 * @memberOf module:leadfoot/Session#
 * @param {string} text The partial link text of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element in the currently active window/frame matching the given HTML tag name.
 *
 * @method findByTagName
 * @memberOf module:leadfoot/Session#
 * @param {string} tagName The tag name of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element in the currently active window/frame matching the given XPath selector.
 *
 * @method findByXpath
 * @memberOf module:leadfoot/Session#
 * @param {string} path The XPath selector to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets all elements in the currently active window/frame matching the given CSS class name.
 *
 * @method findAllByClassName
 * @memberOf module:leadfoot/Session#
 * @param {string} className The CSS class name to search for.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements in the currently active window/frame matching the given CSS selector.
 *
 * @method findAllByCssSelector
 * @memberOf module:leadfoot/Session#
 * @param {string} selector The CSS selector to search for.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements in the currently active window/frame matching the given name attribute.
 *
 * @method findAllByName
 * @memberOf module:leadfoot/Session#
 * @param {string} name The name of the element.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements in the currently active window/frame matching the given case-insensitive link text.
 *
 * @method findAllByLinkText
 * @memberOf module:leadfoot/Session#
 * @param {string} text The link text of the element.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements in the currently active window/frame partially matching the given case-insensitive
 * link text.
 *
 * @method findAllByPartialLinkText
 * @memberOf module:leadfoot/Session#
 * @param {string} text The partial link text of the element.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements in the currently active window/frame matching the given HTML tag name.
 *
 * @method findAllByTagName
 * @memberOf module:leadfoot/Session#
 * @param {string} tagName The tag name of the element.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements in the currently active window/frame matching the given XPath selector.
 *
 * @method findAllByXpath
 * @memberOf module:leadfoot/Session#
 * @param {string} path The XPath selector to search for.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */
strategies.applyTo(Session.prototype);

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element in the currently active window/frame
 * matching the given query. This is inherently slower than {@link module:leadfoot/Session#find}, so should only be
 * used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayed
 * @memberOf module:leadfoot/Session#
 * @since 1.6
 *
 * @param {string} using
 * The element retrieval strategy to use. See {@link module:leadfoot/Session#find} for options.
 *
 * @param {string} value
 * The strategy-specific value to search for. See {@link module:leadfoot/Session#find} for details.
 *
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element in the currently active window/frame
 * matching the given CSS class name. This is inherently slower than {@link module:leadfoot/Session#find}, so should
 * only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByClassName
 * @memberOf module:leadfoot/Session#
 * @since 1.6
 * @param {string} className The CSS class name to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element in the currently active window/frame
 * matching the given CSS selector. This is inherently slower than {@link module:leadfoot/Session#find}, so should only
 * be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByCssSelector
 * @memberOf module:leadfoot/Session#
 * @since 1.6
 * @param {string} selector The CSS selector to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element in the currently active window/frame
 * matching the given ID. This is inherently slower than {@link module:leadfoot/Session#find}, so should only be
 * used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedById
 * @memberOf module:leadfoot/Session#
 * @since 1.6
 * @param {string} id The ID of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element in the currently active window/frame
 * matching the given name attribute. This is inherently slower than {@link module:leadfoot/Session#find}, so should
 * only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByName
 * @memberOf module:leadfoot/Session#
 * @since 1.6
 * @param {string} name The name of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element in the currently active window/frame
 * matching the given case-insensitive link text. This is inherently slower than {@link module:leadfoot/Session#find},
 * so should only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByLinkText
 * @memberOf module:leadfoot/Session#
 * @since 1.6
 * @param {string} text The link text of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element in the currently active window/frame
 * partially matching the given case-insensitive link text. This is inherently slower than
 * {@link module:leadfoot/Session#find}, so should only be used in cases where the visibility of an element cannot be
 * ensured in advance.
 *
 * @method findDisplayedByPartialLinkText
 * @memberOf module:leadfoot/Session#
 * @since 1.6
 * @param {string} text The partial link text of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element in the currently active window/frame
 * matching the given HTML tag name. This is inherently slower than {@link module:leadfoot/Session#find}, so should
 * only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByTagName
 * @memberOf module:leadfoot/Session#
 * @since 1.6
 * @param {string} tagName The tag name of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element in the currently active window/frame
 * matching the given XPath selector. This is inherently slower than {@link module:leadfoot/Session#find}, so should
 * only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByXpath
 * @memberOf module:leadfoot/Session#
 * @since 1.6
 * @param {string} path The XPath selector to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */
findDisplayed.applyTo(Session.prototype);

/**
 * Waits for all elements in the currently active window/frame to be destroyed.
 *
 * @method waitForDeleted
 * @memberOf module:leadfoot/Session#
 *
 * @param {string} using
 * The element retrieval strategy to use. See {@link module:leadfoot/Session#find} for options.
 *
 * @param {string} value
 * The strategy-specific value to search for. See {@link module:leadfoot/Session#find} for details.
 *
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements in the currently active window/frame matching the given CSS class name to be
 * destroyed.
 *
 * @method waitForDeletedByClassName
 * @memberOf module:leadfoot/Session#
 * @param {string} className The CSS class name to search for.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements in the currently active window/frame matching the given CSS selector to be destroyed.
 *
 * @method waitForDeletedByCssSelector
 * @memberOf module:leadfoot/Session#
 * @param {string} selector The CSS selector to search for.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements in the currently active window/frame matching the given ID to be destroyed.
 *
 * @method waitForDeletedById
 * @memberOf module:leadfoot/Session#
 * @param {string} id The ID of the element.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements in the currently active window/frame matching the given name attribute to be
 * destroyed.
 *
 * @method waitForDeletedByName
 * @memberOf module:leadfoot/Session#
 * @param {string} name The name of the element.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements in the currently active window/frame matching the given case-insensitive link text
 * to be destroyed.
 *
 * @method waitForDeletedByLinkText
 * @memberOf module:leadfoot/Session#
 * @param {string} text The link text of the element.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements in the currently active window/frame partially matching the given case-insensitive
 * link text to be destroyed.
 *
 * @method waitForDeletedByPartialLinkText
 * @memberOf module:leadfoot/Session#
 * @param {string} text The partial link text of the element.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements in the currently active window/frame matching the given HTML tag name to be destroyed.
 *
 * @method waitForDeletedByTagName
 * @memberOf module:leadfoot/Session#
 * @param {string} tagName The tag name of the element.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements in the currently active window/frame matching the given XPath selector to be
 * destroyed.
 *
 * @method waitForDeletedByXpath
 * @memberOf module:leadfoot/Session#
 * @param {string} path The XPath selector to search for.
 * @returns {Promise.<void>}
 */
waitForDeleted.applyTo(Session.prototype);

/**
 * Gets the timeout for {@link module:leadfoot/Session#executeAsync} calls.
 *
 * @method getExecuteAsyncTimeout
 * @memberOf module:leadfoot/Session#
 * @returns {Promise.<number>}
 */

/**
 * Sets the timeout for {@link module:leadfoot/Session#executeAsync} calls.
 *
 * @method setExecuteAsyncTimeout
 * @memberOf module:leadfoot/Session#
 * @param {number} ms The length of the timeout, in milliseconds.
 * @returns {Promise.<void>}
 */

/**
 * Gets the timeout for {@link module:leadfoot/Session#find} calls.
 *
 * @method getFindTimeout
 * @memberOf module:leadfoot/Session#
 * @returns {Promise.<number>}
 */

/**
 * Sets the timeout for {@link module:leadfoot/Session#find} calls.
 *
 * @method setFindTimeout
 * @memberOf module:leadfoot/Session#
 * @param {number} ms The length of the timeout, in milliseconds.
 * @returns {Promise.<void>}
 */

/**
 * Gets the timeout for {@link module:leadfoot/Session#get} calls.
 *
 * @method getPageLoadTimeout
 * @memberOf module:leadfoot/Session#
 * @returns {Promise.<number>}
 */

/**
 * Sets the timeout for {@link module:leadfoot/Session#get} calls.
 *
 * @method setPageLoadTimeout
 * @memberOf module:leadfoot/Session#
 * @param {number} ms The length of the timeout, in milliseconds.
 * @returns {Promise.<void>}
 */
(function (prototype) {
	var timeouts = {
		script: 'ExecuteAsync',
		implicit: 'Find',
		'page load': 'PageLoad'
	};

	for (var type in timeouts) {
		prototype['get' + timeouts[type] + 'Timeout'] = lang.partial(function (type) {
			return this.getTimeout(type);
		}, type);

		prototype['set' + timeouts[type] + 'Timeout'] = lang.partial(function (type, ms) {
			return this.setTimeout(type, ms);
		}, type);
	}
})(Session.prototype);

module.exports = Session;
