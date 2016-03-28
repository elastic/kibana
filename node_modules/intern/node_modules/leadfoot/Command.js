/**
 * @module leadfoot/Command
 */

var Element = require('./Element');
var Promise = require('dojo/Promise');
var strategies = require('./lib/strategies');
var Session = require('./Session');
var util = require('./lib/util');

/**
 * Creates a function that, when called, creates a new Command that retrieves elements from the parent context and
 * uses them as the context for the newly created Command.
 *
 * @private
 * @param {string} method
 * @returns {Function}
 */
function createElementMethod(method) {
	return function () {
		var args = arguments;

		return new this.constructor(this, function (setContext) {
			var parentContext = this._context;
			var promise;

			if (parentContext.length && parentContext.isSingle) {
				promise = parentContext[0][method].apply(parentContext[0], args);
			}
			else if (parentContext.length) {
				promise = Promise.all(parentContext.map(function (element) {
					return element[method].apply(element, args);
				})).then(function (elements) {
					// findAll against an array context will result in arrays of arrays; flatten into a single
					// array of elements. It would also be possible to resort in document order but other parallel
					// operations could not be sorted so we just don't do it anywhere and say not to rely in
					// a particular return order for results
					return Array.prototype.concat.apply([], elements);
				});
			}
			else {
				promise = this.session[method].apply(this.session, args);
			}

			return promise.then(function (newContext) {
				setContext(newContext);
				return newContext;
			});
		});
	};
}

var TOP_CONTEXT = [];
TOP_CONTEXT.isSingle = true;
TOP_CONTEXT.depth = 0;

/**
 * The Command class is a chainable, subclassable object type that can be used to execute commands serially against a
 * remote WebDriver environment. The standard Command class includes methods from the {@link module:leadfoot/Session}
 * and {@link module:leadfoot/Element} classes, so you can perform all standard session and element operations that
 * come with Leadfoot without being forced to author long promise chains.
 *
 * ***Important*: Due to a documentation tool limitation, the documentation on this page currently lists return values
 * of all methods as being of type `Promise`. All command methods actually return a new object of type `Command`. This
 * issue will be addressed in future versions of the documentation.**
 *
 * In order to use the Command class, you first need to pass it a {@link module:leadfoot/Session} instance for it to
 * use:
 *
 * ```js
 * var command = new Command(session);
 * ```
 *
 * Once you have created the Command, you can then start chaining methods, and they will execute in order one after
 * another:
 *
 * ```js
 * command.get('http://example.com')
 *   .findByTagName('h1')
 *   .getVisibleText()
 *   .then(function (text) {
 *       assert.strictEqual(text, 'Example Domain');
 *   });
 * ```
 *
 * Because these operations are asynchronous, you need to use a `then` callback in order to retrieve the value from the
 * last method. Command objects are Thenables, which means that they can be used with any Promises/A+ or ES6-confirmant
 * Promises implementation, though there are some specific differences in the arguments and context that are provided
 * to callbacks; see {@link module:leadfoot/Command#then} for more details.
 *
 * ---
 *
 * Each call on a Command generates a new Command object, which means that certain operations can be parallelised:
 *
 * ```js
 * command = command.get('http://example.com');
 * Promise.all([
 *   command.getPageTitle(),
 *   command.findByTagName('h1').getVisibleText()
 * ]).then(function (results) {
 *   assert.strictEqual(results[0], results[1]);
 * });
 * ```
 *
 * In this example, the commands on line 3 and 4 both depend upon the `get` call completing successfully but are
 * otherwise independent of each other and so execute here in parallel. This is different from commands in Intern 1
 * which were always chained onto the last called method within a given test.
 *
 * ---
 *
 * Command objects actually encapsulate two different types of interaction: *session* interactions, which operate
 * against the entire browser session, and *element* interactions, which operate against specific elements taken from
 * the currently loaded page. Things like navigating the browser, moving the mouse cursor, and executing scripts are
 * session interactions; things like getting text displayed on the page, typing into form fields, and getting element
 * attributes are element interactions.
 *
 * Session interactions can be performed at any time, from any Command. On the other hand, to perform element
 * interactions, you first need to retrieve one or more elements to interact with. This can be done using any of the
 * `find` or `findAll` methods, by the `getActiveElement` method, or by returning elements from `execute` or
 * `executeAsync` calls. The retrieved elements are stored internally as the *element context* of all chained
 * Commands. When an element method is called on a chained Command with a single element context, the result will be
 * returned as-is:
 *
 * ```js
 * command = command.get('http://example.com')
 *   // finds one element -> single element context
 *   .findByTagName('h1')
 *   .getVisibleText()
 *   .then(function (text) {
 *     // `text` is the text from the element context
 *     assert.strictEqual(text, 'Example Domain');
 *   });
 * ```
 *
 * When an element method is called on a chained Command with a multiple element context, the result will be returned
 * as an array:
 *
 * ```js
 * command = command.get('http://example.com')
 *   // finds multiple elements -> multiple element context
 *   .findAllByTagName('p')
 *   .getVisibleText()
 *   .then(function (texts) {
 *     // `texts` is an array of text from each of the `p` elements
 *     assert.deepEqual(texts, [
 *       'This domain is established to be used for […]',
 *       'More information...'
 *     ]);
 *   });
 * ```
 *
 * The `find` and `findAll` methods are special and change their behaviour based on the current element filtering state
 * of a given command. If a command has been filtered by element, the `find` and `findAll` commands will only find
 * elements *within* the currently filtered set of elements. Otherwise, they will find elements throughout the page.
 *
 * Some method names, like `click`, are identical for both Session and Element APIs; in this case, the element APIs
 * are suffixed with the word `Element` in order to identify them uniquely.
 *
 * ---
 *
 * Commands can be subclassed in order to add additional functionality without making direct modifications to the
 * default Command prototype that might break other parts of the system:
 *
 * ```js
 * function CustomCommand() {
 *   Command.apply(this, arguments);
 * }
 * CustomCommand.prototype = Object.create(Command.prototype);
 * CustomCommand.prototype.constructor = CustomCommand;
 * CustomCommand.prototype.login = function (username, password) {
 *   return new this.constructor(this, function () {
 *     return this.parent
 *       .findById('username')
 *         .click()
 *         .type(username)
 *         .end()
 *       .findById('password')
 *         .click()
 *         .type(password)
 *         .end()
 *       .findById('login')
 *         .click()
 *         .end();
 *   });
 * };
 * ```
 *
 * Note that returning `this`, or a command chain starting from `this`, from a callback or command initialiser will
 * deadlock the Command, as it waits for itself to settle before settling.
 *
 * @constructor module:leadfoot/Command
 * @param {module:leadfoot/Command|module:leadfoot/Session} parent
 * The parent command that this command is chained to, or a {@link module:leadfoot/Session} object if this is the
 * first command in a command chain.
 *
 * @param {function(setContext:Function, value:any): (any|Promise)} initialiser
 * A function that will be executed when all parent commands have completed execution. This function can create a
 * new context for this command by calling the passed `setContext` function any time prior to resolving the Promise
 * that it returns. If no context is explicitly provided, the context from the parent command will be used.
 *
 * @param {(function(setContext:Function, error:Error): (any|Promise))=} errback
 * A function that will be executed if any parent commands failed to complete successfully. This function can create
 * a new context for the current command by calling the passed `setContext` function any time prior to resolving the
 * Promise that it returns. If no context is explicitly provided, the context from the parent command will be used.
 *
 * @borrows module:leadfoot/Session#getTimeout as module:leadfoot/Command#getTimeout
 * @borrows module:leadfoot/Session#setTimeout as module:leadfoot/Command#setTimeout
 * @borrows module:leadfoot/Session#getCurrentWindowHandle as module:leadfoot/Command#getCurrentWindowHandle
 * @borrows module:leadfoot/Session#getAllWindowHandles as module:leadfoot/Command#getAllWindowHandles
 * @borrows module:leadfoot/Session#getCurrentUrl as module:leadfoot/Command#getCurrentUrl
 * @borrows module:leadfoot/Session#get as module:leadfoot/Command#get
 * @borrows module:leadfoot/Session#goForward as module:leadfoot/Command#goForward
 * @borrows module:leadfoot/Session#goBack as module:leadfoot/Command#goBack
 * @borrows module:leadfoot/Session#refresh as module:leadfoot/Command#refresh
 * @borrows module:leadfoot/Session#execute as module:leadfoot/Command#execute
 * @borrows module:leadfoot/Session#executeAsync as module:leadfoot/Command#executeAsync
 * @borrows module:leadfoot/Session#takeScreenshot as module:leadfoot/Command#takeScreenshot
 * @borrows module:leadfoot/Session#getAvailableImeEngines as module:leadfoot/Command#getAvailableImeEngines
 * @borrows module:leadfoot/Session#getActiveImeEngine as module:leadfoot/Command#getActiveImeEngine
 * @borrows module:leadfoot/Session#isImeActivated as module:leadfoot/Command#isImeActivated
 * @borrows module:leadfoot/Session#deactivateIme as module:leadfoot/Command#deactivateIme
 * @borrows module:leadfoot/Session#activateIme as module:leadfoot/Command#activateIme
 * @borrows module:leadfoot/Session#switchToFrame as module:leadfoot/Command#switchToFrame
 * @borrows module:leadfoot/Session#switchToWindow as module:leadfoot/Command#switchToWindow
 * @borrows module:leadfoot/Session#switchToParentFrame as module:leadfoot/Command#switchToParentFrame
 * @borrows module:leadfoot/Session#closeCurrentWindow as module:leadfoot/Command#closeCurrentWindow
 * @borrows module:leadfoot/Session#setWindowSize as module:leadfoot/Command#setWindowSize
 * @borrows module:leadfoot/Session#getWindowSize as module:leadfoot/Command#getWindowSize
 * @borrows module:leadfoot/Session#setWindowPosition as module:leadfoot/Command#setWindowPosition
 * @borrows module:leadfoot/Session#getWindowPosition as module:leadfoot/Command#getWindowPosition
 * @borrows module:leadfoot/Session#maximizeWindow as module:leadfoot/Command#maximizeWindow
 * @borrows module:leadfoot/Session#getCookies as module:leadfoot/Command#getCookies
 * @borrows module:leadfoot/Session#setCookie as module:leadfoot/Command#setCookie
 * @borrows module:leadfoot/Session#clearCookies as module:leadfoot/Command#clearCookies
 * @borrows module:leadfoot/Session#deleteCookie as module:leadfoot/Command#deleteCookie
 * @borrows module:leadfoot/Session#getPageSource as module:leadfoot/Command#getPageSource
 * @borrows module:leadfoot/Session#getPageTitle as module:leadfoot/Command#getPageTitle
 * @borrows module:leadfoot/Session#find as module:leadfoot/Command#find
 * @borrows module:leadfoot/Session#findAll as module:leadfoot/Command#findAll
 * @borrows module:leadfoot/Session#getActiveElement as module:leadfoot/Command#getActiveElement
 * @borrows module:leadfoot/Session#pressKeys as module:leadfoot/Command#pressKeys
 * @borrows module:leadfoot/Session#getOrientation as module:leadfoot/Command#getOrientation
 * @borrows module:leadfoot/Session#setOrientation as module:leadfoot/Command#setOrientation
 * @borrows module:leadfoot/Session#getAlertText as module:leadfoot/Command#getAlertText
 * @borrows module:leadfoot/Session#typeInPrompt as module:leadfoot/Command#typeInPrompt
 * @borrows module:leadfoot/Session#acceptAlert as module:leadfoot/Command#acceptAlert
 * @borrows module:leadfoot/Session#dismissAlert as module:leadfoot/Command#dismissAlert
 * @borrows module:leadfoot/Session#moveMouseTo as module:leadfoot/Command#moveMouseTo
 * @borrows module:leadfoot/Session#clickMouseButton as module:leadfoot/Command#clickMouseButton
 * @borrows module:leadfoot/Session#pressMouseButton as module:leadfoot/Command#pressMouseButton
 * @borrows module:leadfoot/Session#releaseMouseButton as module:leadfoot/Command#releaseMouseButton
 * @borrows module:leadfoot/Session#doubleClick as module:leadfoot/Command#doubleClick
 * @borrows module:leadfoot/Session#tap as module:leadfoot/Command#tap
 * @borrows module:leadfoot/Session#pressFinger as module:leadfoot/Command#pressFinger
 * @borrows module:leadfoot/Session#releaseFinger as module:leadfoot/Command#releaseFinger
 * @borrows module:leadfoot/Session#moveFinger as module:leadfoot/Command#moveFinger
 * @borrows module:leadfoot/Session#touchScroll as module:leadfoot/Command#touchScroll
 * @borrows module:leadfoot/Session#doubleTap as module:leadfoot/Command#doubleTap
 * @borrows module:leadfoot/Session#longTap as module:leadfoot/Command#longTap
 * @borrows module:leadfoot/Session#flickFinger as module:leadfoot/Command#flickFinger
 * @borrows module:leadfoot/Session#getGeolocation as module:leadfoot/Command#getGeolocation
 * @borrows module:leadfoot/Session#setGeolocation as module:leadfoot/Command#setGeolocation
 * @borrows module:leadfoot/Session#getLogsFor as module:leadfoot/Command#getLogsFor
 * @borrows module:leadfoot/Session#getAvailableLogTypes as module:leadfoot/Command#getAvailableLogTypes
 * @borrows module:leadfoot/Session#getApplicationCacheStatus as module:leadfoot/Command#getApplicationCacheStatus
 * @borrows module:leadfoot/Session#quit as module:leadfoot/Command#quit
 * @borrows module:leadfoot/Session#getLocalStorageKeys as module:leadfoot/Command#getLocalStorageKeys
 * @borrows module:leadfoot/Session#setLocalStorageItem as module:leadfoot/Command#setLocalStorageItem
 * @borrows module:leadfoot/Session#clearLocalStorage as module:leadfoot/Command#clearLocalStorage
 * @borrows module:leadfoot/Session#getLocalStorageItem as module:leadfoot/Command#getLocalStorageItem
 * @borrows module:leadfoot/Session#deleteLocalStorageItem as module:leadfoot/Command#deleteLocalStorageItem
 * @borrows module:leadfoot/Session#getLocalStorageLength as module:leadfoot/Command#getLocalStorageLength
 * @borrows module:leadfoot/Session#getSessionStorageKeys as module:leadfoot/Command#getSessionStorageKeys
 * @borrows module:leadfoot/Session#setSessionStorageItem as module:leadfoot/Command#setSessionStorageItem
 * @borrows module:leadfoot/Session#clearSessionStorage as module:leadfoot/Command#clearSessionStorage
 * @borrows module:leadfoot/Session#getSessionStorageItem as module:leadfoot/Command#getSessionStorageItem
 * @borrows module:leadfoot/Session#deleteSessionStorageItem as module:leadfoot/Command#deleteSessionStorageItem
 * @borrows module:leadfoot/Session#getSessionStorageLength as module:leadfoot/Command#getSessionStorageLength
 * @borrows module:leadfoot/Session#findByClassName as module:leadfoot/Command#findByClassName
 * @borrows module:leadfoot/Session#findByCssSelector as module:leadfoot/Command#findByCssSelector
 * @borrows module:leadfoot/Session#findById as module:leadfoot/Command#findById
 * @borrows module:leadfoot/Session#findByName as module:leadfoot/Command#findByName
 * @borrows module:leadfoot/Session#findByLinkText as module:leadfoot/Command#findByLinkText
 * @borrows module:leadfoot/Session#findByPartialLinkText as module:leadfoot/Command#findByPartialLinkText
 * @borrows module:leadfoot/Session#findByTagName as module:leadfoot/Command#findByTagName
 * @borrows module:leadfoot/Session#findByXpath as module:leadfoot/Command#findByXpath
 * @borrows module:leadfoot/Session#findAllByClassName as module:leadfoot/Command#findAllByClassName
 * @borrows module:leadfoot/Session#findAllByCssSelector as module:leadfoot/Command#findAllByCssSelector
 * @borrows module:leadfoot/Session#findAllByName as module:leadfoot/Command#findAllByName
 * @borrows module:leadfoot/Session#findAllByLinkText as module:leadfoot/Command#findAllByLinkText
 * @borrows module:leadfoot/Session#findAllByPartialLinkText as module:leadfoot/Command#findAllByPartialLinkText
 * @borrows module:leadfoot/Session#findAllByTagName as module:leadfoot/Command#findAllByTagName
 * @borrows module:leadfoot/Session#findAllByXpath as module:leadfoot/Command#findAllByXpath
 * @borrows module:leadfoot/Session#findDisplayed as module:leadfoot/Command#findDisplayed
 * @borrows module:leadfoot/Session#findDisplayedByClassName as module:leadfoot/Command#findDisplayedByClassName
 * @borrows module:leadfoot/Session#findDisplayedByCssSelector as module:leadfoot/Command#findDisplayedByCssSelector
 * @borrows module:leadfoot/Session#findDisplayedById as module:leadfoot/Command#findDisplayedById
 * @borrows module:leadfoot/Session#findDisplayedByName as module:leadfoot/Command#findDisplayedByName
 * @borrows module:leadfoot/Session#findDisplayedByLinkText as module:leadfoot/Command#findDisplayedByLinkText
 * @borrows module:leadfoot/Session#findDisplayedByPartialLinkText as module:leadfoot/Command#findDisplayedByPartialLinkText
 * @borrows module:leadfoot/Session#findDisplayedByTagName as module:leadfoot/Command#findDisplayedByTagName
 * @borrows module:leadfoot/Session#findDisplayedByXpath as module:leadfoot/Command#findDisplayedByXpath
 * @borrows module:leadfoot/Session#waitForDeletedByClassName as module:leadfoot/Command#waitForDeletedByClassName
 * @borrows module:leadfoot/Session#waitForDeletedByCssSelector as module:leadfoot/Command#waitForDeletedByCssSelector
 * @borrows module:leadfoot/Session#waitForDeletedById as module:leadfoot/Command#waitForDeletedById
 * @borrows module:leadfoot/Session#waitForDeletedByName as module:leadfoot/Command#waitForDeletedByName
 * @borrows module:leadfoot/Session#waitForDeletedByLinkText as module:leadfoot/Command#waitForDeletedByLinkText
 * @borrows module:leadfoot/Session#waitForDeletedByPartialLinkText as module:leadfoot/Command#waitForDeletedByPartialLinkText
 * @borrows module:leadfoot/Session#waitForDeletedByTagName as module:leadfoot/Command#waitForDeletedByTagName
 * @borrows module:leadfoot/Session#waitForDeletedByXpath as module:leadfoot/Command#waitForDeletedByXpath
 * @borrows module:leadfoot/Session#getExecuteAsyncTimeout as module:leadfoot/Command#getExecuteAsyncTimeout
 * @borrows module:leadfoot/Session#setExecuteAsyncTimeout as module:leadfoot/Command#setExecuteAsyncTimeout
 * @borrows module:leadfoot/Session#getFindTimeout as module:leadfoot/Command#getFindTimeout
 * @borrows module:leadfoot/Session#setFindTimeout as module:leadfoot/Command#setFindTimeout
 * @borrows module:leadfoot/Session#getPageLoadTimeout as module:leadfoot/Command#getPageLoadTimeout
 * @borrows module:leadfoot/Session#setPageLoadTimeout as module:leadfoot/Command#setPageLoadTimeout
 * @borrows module:leadfoot/Element#click as module:leadfoot/Command#click
 * @borrows module:leadfoot/Element#submit as module:leadfoot/Command#submit
 * @borrows module:leadfoot/Element#getVisibleText as module:leadfoot/Command#getVisibleText
 * @borrows module:leadfoot/Element#type as module:leadfoot/Command#type
 * @borrows module:leadfoot/Element#getTagName as module:leadfoot/Command#getTagName
 * @borrows module:leadfoot/Element#clearValue as module:leadfoot/Command#clearValue
 * @borrows module:leadfoot/Element#isSelected as module:leadfoot/Command#isSelected
 * @borrows module:leadfoot/Element#isEnabled as module:leadfoot/Command#isEnabled
 * @borrows module:leadfoot/Element#getSpecAttribute as module:leadfoot/Command#getSpecAttribute
 * @borrows module:leadfoot/Element#getAttribute as module:leadfoot/Command#getAttribute
 * @borrows module:leadfoot/Element#getProperty as module:leadfoot/Command#getProperty
 * @borrows module:leadfoot/Element#equals as module:leadfoot/Command#equals
 * @borrows module:leadfoot/Element#isDisplayed as module:leadfoot/Command#isDisplayed
 * @borrows module:leadfoot/Element#getPosition as module:leadfoot/Command#getPosition
 * @borrows module:leadfoot/Element#getSize as module:leadfoot/Command#getSize
 * @borrows module:leadfoot/Element#getComputedStyle as module:leadfoot/Command#getComputedStyle
 */
function Command(parent, initialiser, errback) {
	var self = this;
	var session;

	function setContext(context) {
		if (!Array.isArray(context)) {
			context = [ context ];
			context.isSingle = true;
		}

		// If the context being set has depth, then it is coming from `Command#end`,
		// or someone smart knows what they are doing; do not change the depth
		if (!('depth' in context)) {
			context.depth = parent ? parent.context.depth + 1 : 0;
		}

		self._context = context;
	}

	function fixStack(error) {
		error.stack = error.stack + util.trimStack(trace.stack);
		throw error;
	}

	if (parent && parent.session) {
		this._parent = parent;
		session = this._session = parent.session;
	}
	else if (parent && parent.sessionId) {
		session = this._session = parent;
		parent = null;
	}
	else {
		throw new Error('A parent Command or Session must be provided to a new Command');
	}

	// Add any custom functions from the session to this command object so they can be accessed automatically
	// using the fluid interfaces
	// TODO: Test
	for (var key in session) {
		if (session[key] !== Session.prototype[key]) {
			Command.addSessionMethod(this, key, session[key]);
		}
	}

	var trace = {};
	Error.captureStackTrace(trace, Command);

	this._promise = (parent ? parent.promise : Promise.resolve(undefined)).then(function (returnValue) {
		self._context = parent ? parent.context : TOP_CONTEXT;
		return returnValue;
	}, function (error) {
		self._context = parent ? parent.context : TOP_CONTEXT;
		throw error;
	}).then(
		initialiser && function (returnValue) {
			return Promise.resolve(returnValue)
				.then(initialiser.bind(self, setContext))
				.catch(fixStack);
		},
		errback && function (error) {
			return Promise.reject(error)
				.catch(errback.bind(self, setContext))
				.catch(fixStack);
		}
	);
}

/**
 * @lends module:leadfoot/Command#
 */
Command.prototype = {
	constructor: Command,

	/**
	 * The parent Command of the Command, if one exists.
	 *
	 * @member {module:leadfoot/Command=} parent
	 * @memberOf module:leadfoot/Command#
	 * @readonly
	 */
	get parent() {
		return this._parent;
	},

	/**
	 * The parent Session of the Command.
	 *
	 * @member {module:leadfoot/Session} session
	 * @memberOf module:leadfoot/Command#
	 * @readonly
	 */
	get session() {
		return this._session;
	},

	/**
	 * The filtered elements that will be used if an element-specific method is invoked. Note that this property is not
	 * valid until the parent Command has been settled. The context array also has two additional properties:
	 *
	 * - isSingle (boolean): If true, the context will always contain a single element. This is used to differentiate
	 *   between methods that should still return scalar values (`find`) and methods that should return arrays of
	 *   values even if there is only one element in the context (`findAll`).
	 * - depth (number): The depth of the context within the command chain. This is used to prevent traversal into
	 *   higher filtering levels by {@link module:leadfoot/Command#end}.
	 *
	 * @member {module:leadfoot/Element[]} context
	 * @memberOf module:leadfoot/Command#
	 * @readonly
	 */
	get context() {
		return this._context;
	},

	/**
	 * The underlying Promise for the Command.
	 *
	 * @member {Promise.<any>} promise
	 * @memberOf module:leadfoot/Command#
	 * @readonly
	 */
	get promise() {
		return this._promise;
	},

	/**
	 * Pauses execution of the next command in the chain for `ms` milliseconds.
	 *
	 * @param {number} ms Time to delay, in milliseconds.
	 * @returns {module:leadfoot/Command.<void>}
	 */
	sleep: function (ms) {
		return new this.constructor(this, function () {
			return util.sleep(ms);
		});
	},

	/**
	 * Ends the most recent filtering operation in the current Command chain and returns the set of matched elements
	 * to the previous state. This is equivalent to the `jQuery#end` method.
	 *
	 * @example
	 * command
	 *   .findById('parent') // sets filter to #parent
	 *     .findByClassName('child') // sets filter to all .child inside #parent
	 *       .getVisibleText()
	 *       .then(function (visibleTexts) {
	 *         // all the visible texts from the children
	 *       })
	 *       .end() // resets filter to #parent
	 *     .end(); // resets filter to nothing (the whole document)
	 *
	 * @param {number=} numCommandsToPop The number of element contexts to pop. Defaults to 1.
	 * @returns {module:leadfoot/Command.<void>}
	 */
	end: function (numCommandsToPop) {
		numCommandsToPop = numCommandsToPop || 1;

		return new this.constructor(this, function (setContext) {
			var command = this;
			var depth = this.context.depth;

			while (depth && numCommandsToPop && (command = command.parent)) {
				if (command.context.depth < depth) {
					--numCommandsToPop;
					depth = command.context.depth;
				}
			}

			setContext(command.context);
		});
	},

	/**
	 * Adds a callback to be invoked once the previously chained operation has completed.
	 *
	 * This method is compatible with the `Promise#then` API, with two important differences:
	 *
	 * 1. The context (`this`) of the callback is set to the Command object, rather than being `undefined`. This allows
	 *    promise helpers to be created that can retrieve the appropriate session and element contexts for execution.
	 * 2. A second non-standard `setContext` argument is passed to the callback. This `setContext` function can be
	 *    called at any time before the callback fulfills its return value and expects either a single
	 *    {@link module:leadfoot/Element} or an array of Elements to be provided as its only argument. The provided
	 *    element(s) will be used as the context for subsequent element method invocations (`click`, etc.). If
	 *    the `setContext` method is not called, the element context from the parent will be passed through unmodified.
	 *
	 * @param {Function=} callback
	 * @param {Function=} errback
	 * @returns {module:leadfoot/Command.<any>}
	 */
	then: function (callback, errback) {
		function runCallback(command, callback, value, setContext) {
			var returnValue = callback.call(command, value, setContext);

			// If someone returns `this` (or a chain starting from `this`) from the callback, it will cause a deadlock
			// where the child command is waiting for the child command to resolve
			if (returnValue instanceof command.constructor) {
				var maybeCommand = returnValue;
				do {
					if (maybeCommand === command) {
						throw new Error('Deadlock: do not use `return this` from a Command callback');
					}
				} while ((maybeCommand = maybeCommand.parent));
			}

			return returnValue;
		}

		return new this.constructor(this, callback && function (setContext, value) {
			return runCallback(this, callback, value, setContext);
		}, errback && function (setContext, value) {
			return runCallback(this, errback, value, setContext);
		});
	},

	/**
	 * Adds a callback to be invoked when any of the previously chained operations have failed.
	 *
	 * @param {Function} errback
	 * @returns {module:leadfoot/Command.<any>}
	 */
	catch: function (errback) {
		return this.then(null, errback);
	},

	/**
	 * Adds a callback to be invoked once the previously chained operations have resolved.
	 *
	 * @param {Function} callback
	 * @returns {module:leadfoot/Command.<any>}
	 */
	finally: function (callback) {
		return this.then(callback, callback);
	},

	/**
	 * Cancels all outstanding chained operations of the Command. Calling this method will cause this command and all
	 * subsequent chained commands to fail with a CancelError.
	 *
	 * @returns {module:leadfoot/Command.<void>}
	 */
	cancel: function () {
		this._promise.cancel.apply(this._promise, arguments);
		return this;
	},

	find: createElementMethod('find'),
	findAll: createElementMethod('findAll'),
	findDisplayed: createElementMethod('findDisplayed')
};

/**
 * Augments `target` with a conversion of the `originalFn` method that enables its use with a Command object.
 * This can be used to easily add new methods from any custom object that implements the Session API to any target
 * object that implements the Command API.
 *
 * Functions that are copied may have the following extra properties in order to change the way that Command works
 * with these functions:
 *
 * - `createsContext` (boolean): If this property is specified, the return value from the function will be used as
 *   the new context for the returned Command.
 * - `usesElement` (boolean): If this property is specified, element(s) from the current context will be used as
 *   the first argument to the function, if the explicitly specified first argument is not already an element.
 *
 * @memberOf module:leadfoot/Command
 * @param {module:leadfoot/Command} target
 * @param {string} key
 * @param {Function} originalFn
 */
Command.addSessionMethod = function (target, key, originalFn) {
	// Checking for private/non-functions here deduplicates this logic; otherwise it would need to exist in both
	// the Command constructor (for copying functions from sessions) as well as the Command factory below
	if (key.charAt(0) !== '_' && !target[key] && typeof originalFn === 'function') {
		target[key] = function () {
			var args = arguments;

			return new this.constructor(this, function (setContext) {
				var parentContext = this._context;
				var session = this._session;
				// The function may have come from a session object prototype but have been overridden on the actual
				// session instance; in such a case, the overridden function should be used instead of the one from
				// the original source object. The original source object may still be used, however, if the
				// function is being added like a mixin and does not exist on the actual session object for this
				// session
				var fn = session[key] || originalFn;

				if (fn.usesElement && parentContext.length && (!args[0] || !args[0].elementId)) {
					var promise;
					// Defer converting arguments into an array until it is necessary to avoid overhead
					args = Array.prototype.slice.call(args, 0);

					if (parentContext.isSingle) {
						promise = fn.apply(session, [ parentContext[0] ].concat(args));
					}
					else {
						promise = Promise.all(parentContext.map(function (element) {
							return fn.apply(session, [ element ].concat(args));
						}));
					}
				}
				else {
					promise = fn.apply(session, args);
				}

				if (fn.createsContext) {
					promise = promise.then(function (newContext) {
						setContext(newContext);
						return newContext;
					});
				}

				return promise;
			});
		};
	}
};

/**
 * Augments `target` with a method that will call `key` on all context elements stored within `target`.
 * This can be used to easily add new methods from any custom object that implements the Element API to any target
 * object that implements the Command API.
 *
 * Functions that are copied may have the following extra properties in order to change the way that Command works
 * with these functions:
 *
 * - `createsContext` (boolean): If this property is specified, the return value from the function will be used as
 *   the new context for the returned Command.
 *
 * @memberOf module:leadfoot/Command
 * @param {module:leadfoot/Command} target
 * @param {string} key
 */
Command.addElementMethod = function (target, key) {
	if (key.charAt(0) !== '_') {
		// some methods, like `click`, exist on both Session and Element; deduplicate these methods by appending the
		// element ones with 'Element'
		var targetKey = key + (target[key] ? 'Element' : '');
		target[targetKey] = function () {
			var args = arguments;

			return new this.constructor(this, function (setContext) {
				var parentContext = this._context;
				var promise;
				var fn = parentContext[0] && parentContext[0][key];

				if (parentContext.isSingle) {
					promise = fn.apply(parentContext[0], args);
				}
				else {
					promise = Promise.all(parentContext.map(function (element) {
						return element[key].apply(element, args);
					}));
				}

				if (fn && fn.createsContext) {
					promise = promise.then(function (newContext) {
						setContext(newContext);
						return newContext;
					});
				}

				return promise;
			});
		};
	}
};

// Element retrieval strategies must be applied directly to Command because it has its own custom
// find/findAll methods that operate based on the Command’s context, so can’t simply be delegated to the
// underlying session
strategies.applyTo(Command.prototype);

(function () {
	var key;
	for (key in Session.prototype) {
		Command.addSessionMethod(Command.prototype, key, Session.prototype[key]);
	}

	for (key in Element.prototype) {
		Command.addElementMethod(Command.prototype, key);
	}
})();

try {
	var chaiAsPromised = require('chai-as-promised');
}
catch (error) {}

// TODO: Add unit test
if (chaiAsPromised) {
	chaiAsPromised.transferPromiseness = function (assertion, promise) {
		assertion.then = promise.then.bind(promise);
		for (var method in promise) {
			if (typeof promise[method] === 'function') {
				assertion[method] = promise[method].bind(promise);
			}
		}
	};
}

module.exports = Command;
