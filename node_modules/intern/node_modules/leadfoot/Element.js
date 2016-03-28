/* global window:false */

/**
 * @module leadfoot/Element
 */

var findDisplayed = require('./lib/findDisplayed');
var fs = require('fs');
var strategies = require('./lib/strategies');
var waitForDeleted = require('./lib/waitForDeleted');
var util = require('./lib/util');

/**
 * Delegates the HTTP request for a method to the underlying {@link module:leadfoot/Session} object.
 *
 * @private
 * @param {string} method
 * @returns {Promise.<any>}
 */
function delegateToSession(method) {
	return function (path, requestData, pathParts) {
		path = 'element/' + encodeURIComponent(this._elementId) + '/' + path;
		return this._session[method](path, requestData, pathParts);
	};
}

function noop() {
	// At least ios-driver 0.6.6 returns an empty object for methods that are supposed to return no value at all,
	// which is not correct
}

/**
 * An Element represents a DOM or UI element within the remote environment.
 *
 * @constructor module:leadfoot/Element
 *
 * @param {string|module:leadfoot/Element|{ ELEMENT: string }} elementId
 * The ID of the element, as provided by the remote.
 *
 * @param {module:leadfoot/Session} session
 * The session that the element belongs to.
 */
function Element(elementId, session) {
	this._elementId = elementId.ELEMENT || elementId.elementId || elementId;
	this._session = session;
}

/**
 * @lends module:leadfoot/Element#
 */
Element.prototype = {
	constructor: Element,

	/**
	 * The opaque, remote-provided ID of the element.
	 *
	 * @member {string} elementId
	 * @memberOf module:leadfoot/Element#
	 * @readonly
	 */
	get elementId() {
		return this._elementId;
	},

	/**
	 * The session that the element belongs to.
	 *
	 * @member {module:leadfoot/Session} session
	 * @memberOf module:leadfoot/Element#
	 * @readonly
	 */
	get session() {
		return this._session;
	},

	_get: delegateToSession('_get'),
	_post: delegateToSession('_post'),

	toJSON: function () {
		return { ELEMENT: this._elementId };
	},

	/**
	 * Gets the first element within this element that matches the given query.
	 *
	 * @see {@link module:leadfoot/Session#setFindTimeout} to set the amount of time it the remote environment
	 * should spend waiting for an element that does not exist at the time of the `find` call before timing
	 * out.
	 *
	 * @param {string} using
	 * The element retrieval strategy to use. See {@link module:leadfoot/Session#find} for options.
	 *
	 * @param {string} value
	 * The strategy-specific value to search for. See {@link module:leadfoot/Session#find} for details.
	 *
	 * @returns {Promise.<module:leadfoot/Element>}
	 */
	find: function (using, value) {
		var session = this._session;
		return this._post('element', {
			using: using,
			value: value
		}).then(function (element) {
			return new Element(element, session);
		});
	},

	/**
	 * Gets all elements within this element that match the given query.
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
		var session = this._session;
		return this._post('elements', {
			using: using,
			value: value
		}).then(function (elements) {
			return elements.map(function (element) {
				return new Element(element, session);
			});
		});
	},

	/**
	 * Clicks the element. This method works on both mouse and touch platforms.
	 *
	 * @returns {Promise.<void>}
	 */
	click: function () {
		var self = this;
		return this._post('click').then(function () {
			// ios-driver 0.6.6-SNAPSHOT April 2014 does not wait until the default action for a click event occurs
			// before returning
			if (self.session.capabilities.touchEnabled) {
				return util.sleep(300);
			}
		});
	},

	/**
	 * Submits the element, if it is a form, or the form belonging to the element, if it is a form element.
	 *
	 * @returns {Promise.<void>}
	 */
	submit: function () {
		if (this.session.capabilities.brokenSubmitElement) {
			return this.session.execute(/* istanbul ignore next */ function (element) {
				if (element.submit) {
					element.submit();
				}
				else if (element.type === 'submit' && element.click) {
					element.click();
				}
			}, [ this ]);
		}

		return this._post('submit').then(noop);
	},

	/**
	 * Gets the visible text within the element. `<br>` elements are converted to line breaks in the returned
	 * text, and whitespace is normalised per the usual XML/HTML whitespace normalisation rules.
	 *
	 * @returns {Promise.<string>}
	 */
	getVisibleText: function () {
		return this._get('text');
	},

	/**
	 * Types into the element. This method works the same as the {@link module:leadfoot/Session#pressKeys} method
	 * except that any modifier keys are automatically released at the end of the command. This method should be used
	 * instead of {@link module:leadfoot/Session#pressKeys} to type filenames into file upload fields.
	 *
	 * Since 1.5, if the WebDriver server supports remote file uploads, and you type a path to a file on your local
	 * computer, that file will be transparently uploaded to the remote server and the remote filename will be typed
	 * instead. If you do not want to upload local files, use {@link module:leadfoot/Session#pressKeys} instead.
	 *
	 * @param {string|string[]} value
	 * The text to type in the remote environment. See {@link module:leadfoot/Session#pressKeys} for more information.
	 *
	 * @returns {Promise.<void>}
	 */
	type: function (value) {
		if (!Array.isArray(value)) {
			value = [ value ];
		}

		if (this.session.capabilities.remoteFiles) {
			var filename = value.join('');

			if (fs.existsSync(filename)) {
				return this.session._uploadFile(filename).then(this.type.bind(this));
			}
		}

		return this._post('value', {
			value: value
		}).then(noop);
	},

	/**
	 * Gets the tag name of the element. For HTML documents, the value is always lowercase.
	 *
	 * @returns {Promise.<string>}
	 */
	getTagName: function () {
		var self = this;
		return this._get('name').then(function (name) {
			if (self.session.capabilities.brokenHtmlTagName) {
				return self.session.execute(
					'return document.body && document.body.tagName === document.body.tagName.toUpperCase();'
				).then(function (isHtml) {
					return isHtml ? name.toLowerCase() : name;
				});
			}

			return name;
		});
	},

	/**
	 * Clears the value of a form element.
	 *
	 * @returns {Promise.<void>}
	 */
	clearValue: function () {
		return this._post('clear').then(noop);
	},

	/**
	 * Returns whether or not a form element is currently selected (for drop-down options and radio buttons), or
	 * whether or not the element is currently checked (for checkboxes).
	 *
	 * @returns {Promise.<boolean>}
	 */
	isSelected: function () {
		return this._get('selected');
	},

	/**
	 * Returns whether or not a form element can be interacted with.
	 *
	 * @returns {Promise.<boolean>}
	 */
	isEnabled: function () {
		return this._get('enabled');
	},

	/**
	 * Gets a property or attribute of the element according to the WebDriver specification algorithm. Use of this
	 * method is not recommended; instead, use {@link module:leadfoot/Element#getAttribute} to retrieve DOM attributes
	 * and {@link module:leadfoot/Element#getProperty} to retrieve DOM properties.
	 *
	 * This method uses the following algorithm on the server to determine what value to return:
	 *
	 * 1. If `name` is 'style', returns the `style.cssText` property of the element.
	 * 2. If the attribute exists and is a boolean attribute, returns 'true' if the attribute is true, or null
	 *    otherwise.
	 * 3. If the element is an `<option>` element and `name` is 'value', returns the `value` attribute if it exists,
	 *    otherwise returns the visible text content of the option.
	 * 4. If the element is a checkbox or radio button and `name` is 'selected', returns 'true' if the element is
	 *    checked, or null otherwise.
	 * 5. If the returned value is expected to be a URL (e.g. element is `<a>` and attribute is `href`), returns the
	 *    fully resolved URL from the `href`/`src` property of the element, not the attribute.
	 * 6. If `name` is 'class', returns the `className` property of the element.
	 * 7. If `name` is 'readonly', returns 'true' if the `readOnly` property is true, or null otherwise.
	 * 8. If `name` corresponds to a property of the element, and the property is not an Object, return the property
	 *    value coerced to a string.
	 * 9. If `name` corresponds to an attribute of the element, return the attribute value.
	 *
	 * @param {string} name The property or attribute name.
	 * @returns {Promise.<string>} The value of the attribute as a string, or `null` if no such property or
	 * attribute exists.
	 */
	getSpecAttribute: function (name) {
		var self = this;
		return this._get('attribute/$0', null, [ name ]).then(function (value) {
			if (self.session.capabilities.brokenNullGetSpecAttribute && (value === '' || value === undefined)) {
				return self.session.execute(/* istanbul ignore next */ function (element, name) {
					return element.hasAttribute(name);
				}, [ self, name ]).then(function (hasAttribute) {
					return hasAttribute ? value : null;
				});
			}

			return value;
		}).then(function (value) {
			// At least ios-driver 0.6.6-SNAPSHOT violates draft spec and returns boolean attributes as
			// booleans instead of the string "true" or null
			if (typeof value === 'boolean') {
				value = value ? 'true' : null;
			}

			return value;
		});
	},

	/**
	 * Gets an attribute of the element.
	 *
	 * @see Element#getProperty to retrieve an element property.
	 * @param {string} name The name of the attribute.
	 * @returns {Promise.<string>} The value of the attribute, or `null` if no such attribute exists.
	 */
	getAttribute: function (name) {
		return this.session.execute('return arguments[0].getAttribute(arguments[1]);', [ this, name ]);
	},

	/**
	 * Gets a property of the element.
	 *
	 * @see Element#getAttribute to retrieve an element attribute.
	 * @param {string} name The name of the property.
	 * @returns {Promise.<any>} The value of the property.
	 */
	getProperty: function (name) {
		return this.session.execute('return arguments[0][arguments[1]];', [ this, name ]);
	},

	/**
	 * Determines if this element is equal to another element.
	 *
	 * @param {module:leadfoot/Element} other
	 * @returns {Promise.<boolean>}
	 */
	equals: function (other) {
		var elementId = other.elementId || other;
		var self = this;
		return this._get('equals/$0', null, [ elementId ]).catch(function (error) {
			// At least Selendroid 0.9.0 does not support this command;
			// At least ios-driver 0.6.6-SNAPSHOT April 2014 fails
			if (error.name === 'UnknownCommand' ||
				(error.name === 'UnknownError' && error.message.indexOf('bug.For input string:') > -1)
			) {
				return self.session.execute('return arguments[0] === arguments[1];', [ self, other ]);
			}

			throw error;
		});
	},

	/**
	 * Returns whether or not the element would be visible to an actual user. This means that the following types
	 * of elements are considered to be not displayed:
	 *
	 * 1. Elements with `display: none`
	 * 2. Elements with `visibility: hidden`
	 * 3. Elements positioned outside of the viewport that cannot be scrolled into view
	 * 4. Elements with `opacity: 0`
	 * 5. Elements with no `offsetWidth` or `offsetHeight`
	 *
	 * @returns {Promise.<boolean>}
	 */
	isDisplayed: function () {
		var self = this;
		return this._get('displayed').then(function (isDisplayed) {

			if (isDisplayed && (
				self.session.capabilities.brokenElementDisplayedOpacity ||
				self.session.capabilities.brokenElementDisplayedOffscreen
			)) {
				return self.session.execute(/* istanbul ignore next */ function (element) {
					var scrollX = document.documentElement.scrollLeft || document.body.scrollLeft;
					var scrollY = document.documentElement.scrollTop || document.body.scrollTop;
					do {
						if (window.getComputedStyle(element, null).opacity === '0') {
							return false;
						}

						var bbox = element.getBoundingClientRect();
						if (bbox.right + scrollX <= 0 || bbox.bottom + scrollY <= 0) {
							return false;
						}
					}
					while ((element = element.parentNode) && element.nodeType === 1);
					return true;
				}, [ self ]);
			}

			return isDisplayed;
		});
	},

	/**
	 * Gets the position of the element relative to the top-left corner of the document, taking into account
	 * scrolling and CSS transformations (if they are supported).
	 *
	 * @returns {Promise.<{ x: number, y: number }>}
	 */
	getPosition: function () {
		if (this.session.capabilities.brokenElementPosition) {
			/* jshint browser:true */
			return this.session.execute(/* istanbul ignore next */ function (element) {
				var bbox = element.getBoundingClientRect();
				var scrollX = document.documentElement.scrollLeft || document.body.scrollLeft;
				var scrollY = document.documentElement.scrollTop || document.body.scrollTop;

				return { x: scrollX + bbox.left, y: scrollY + bbox.top };
			}, [ this ]);
		}

		return this._get('location').then(function (position) {
			// At least FirefoxDriver 2.41.0 incorrectly returns an object with additional `class` and `hCode`
			// properties
			return { x: position.x, y: position.y };
		});
	},

	/**
	 * Gets the size of the element, taking into account CSS transformations (if they are supported).
	 *
	 * @returns {Promise.<{ width: number, height: number }>}
	 */
	getSize: function () {
		function getUsingExecute() {
			return self.session.execute(/* istanbul ignore next */ function (element) {
				var bbox = element.getBoundingClientRect();
				return { width: bbox.right - bbox.left, height: bbox.bottom - bbox.top };
			}, [ self ]);
		}

		var self = this;

		if (this.session.capabilities.brokenCssTransformedSize) {
			return getUsingExecute();
		}

		return this._get('size').catch(function (error) {
			// At least ios-driver 0.6.0-SNAPSHOT April 2014 does not support this command
			if (error.name === 'UnknownCommand') {
				return getUsingExecute();
			}

			throw error;
		}).then(function (dimensions) {
			// At least ChromeDriver 2.9 incorrectly returns an object with an additional `toString` property
			return { width: dimensions.width, height: dimensions.height };
		});
	},

	/**
	 * Gets a CSS computed property value for the element.
	 *
	 * @param {string} propertyName
	 * The CSS property to retrieve. This argument must be camel-case, *not* hyphenated.
	 *
	 * @returns {Promise.<string>}
	 */
	getComputedStyle: function (propertyName) {
		var self = this;
		return this._get('css/$0', null, [ propertyName ]).catch(function (error) {
			// At least Selendroid 0.9.0 does not support this command
			if (error.name === 'UnknownCommand') {
				return self.session.execute(/* istanbul ignore next */ function (element, propertyName) {
					return window.getComputedStyle(element, null)[propertyName];
				}, [ self, propertyName ]);
			}

			// At least ChromeDriver 2.9 incorrectly returns an error for property names it does not understand
			else if (error.name === 'UnknownError' && error.message.indexOf('failed to parse value') > -1) {
				return '';
			}

			throw error;
		}).then(function (value) {
			// At least ChromeDriver 2.9 and Selendroid 0.9.0 returns colour values as rgb instead of rgba
			if (value) {
				value = value.replace(/(.*\b)rgb\((\d+,\s*\d+,\s*\d+)\)(.*)/g, function (_, prefix, rgb, suffix) {
					return prefix + 'rgba(' + rgb + ', 1)' + suffix;
				});
			}

			// For consistency with Firefox, missing values are always returned as empty strings
			return value != null ? value : '';
		});
	}
};

/**
 * Gets the first element inside this element matching the given CSS class name.
 *
 * @method findByClassName
 * @memberOf module:leadfoot/Element#
 * @param {string} className The CSS class name to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element inside this element matching the given CSS selector.
 *
 * @method findByCssSelector
 * @memberOf module:leadfoot/Element#
 * @param {string} selector The CSS selector to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element inside this element matching the given ID.
 *
 * @method findById
 * @memberOf module:leadfoot/Element#
 * @param {string} id The ID of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element inside this element matching the given name attribute.
 *
 * @method findByName
 * @memberOf module:leadfoot/Element#
 * @param {string} name The name of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element inside this element matching the given case-insensitive link text.
 *
 * @method findByLinkText
 * @memberOf module:leadfoot/Element#
 * @param {string} text The link text of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element inside this element partially matching the given case-insensitive link text.
 *
 * @method findByPartialLinkText
 * @memberOf module:leadfoot/Element#
 * @param {string} text The partial link text of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element inside this element matching the given HTML tag name.
 *
 * @method findByTagName
 * @memberOf module:leadfoot/Element#
 * @param {string} tagName The tag name of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first element inside this element matching the given XPath selector.
 *
 * @method findByXpath
 * @memberOf module:leadfoot/Element#
 * @param {string} path The XPath selector to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets all elements inside this element matching the given CSS class name.
 *
 * @method findAllByClassName
 * @memberOf module:leadfoot/Element#
 * @param {string} className The CSS class name to search for.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements inside this element matching the given CSS selector.
 *
 * @method findAllByCssSelector
 * @memberOf module:leadfoot/Element#
 * @param {string} selector The CSS selector to search for.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements inside this element matching the given name attribute.
 *
 * @method findAllByName
 * @memberOf module:leadfoot/Element#
 * @param {string} name The name of the element.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements inside this element matching the given case-insensitive link text.
 *
 * @method findAllByLinkText
 * @memberOf module:leadfoot/Element#
 * @param {string} text The link text of the element.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements inside this element partially matching the given case-insensitive link text.
 *
 * @method findAllByPartialLinkText
 * @memberOf module:leadfoot/Element#
 * @param {string} text The partial link text of the element.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements inside this element matching the given HTML tag name.
 *
 * @method findAllByTagName
 * @memberOf module:leadfoot/Element#
 * @param {string} tagName The tag name of the element.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */

/**
 * Gets all elements inside this element matching the given XPath selector.
 *
 * @method findAllByXpath
 * @memberOf module:leadfoot/Element#
 * @param {string} path The XPath selector to search for.
 * @returns {Promise.<module:leadfoot/Element[]>}
 */
strategies.applyTo(Element.prototype);

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element inside this element
 * matching the given query. This is inherently slower than {@link module:leadfoot/Element#find}, so should only be
 * used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayed
 * @memberOf module:leadfoot/Element#
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
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element inside this element
 * matching the given CSS class name. This is inherently slower than {@link module:leadfoot/Element#find}, so should
 * only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByClassName
 * @memberOf module:leadfoot/Element#
 * @since 1.6
 * @param {string} className The CSS class name to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element inside this element
 * matching the given CSS selector. This is inherently slower than {@link module:leadfoot/Element#find}, so should
 * only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByCssSelector
 * @memberOf module:leadfoot/Element#
 * @since 1.6
 * @param {string} selector The CSS selector to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element inside this element
 * matching the given ID. This is inherently slower than {@link module:leadfoot/Element#find}, so should
 * only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedById
 * @memberOf module:leadfoot/Element#
 * @since 1.6
 * @param {string} id The ID of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element inside this element
 * matching the given name attribute. This is inherently slower than {@link module:leadfoot/Element#find}, so should
 * only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByName
 * @memberOf module:leadfoot/Element#
 * @since 1.6
 * @param {string} name The name of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element inside this element
 * matching the given case-insensitive link text. This is inherently slower than {@link module:leadfoot/Element#find},
 * so should only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByLinkText
 * @memberOf module:leadfoot/Element#
 * @since 1.6
 * @param {string} text The link text of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element inside this element
 * partially matching the given case-insensitive link text. This is inherently slower than
 * {@link module:leadfoot/Element#find}, so should only be used in cases where the visibility of an element cannot be
 * ensured in advance.
 *
 * @method findDisplayedByPartialLinkText
 * @memberOf module:leadfoot/Element#
 * @since 1.6
 * @param {string} text The partial link text of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element inside this element
 * matching the given HTML tag name. This is inherently slower than {@link module:leadfoot/Element#find}, so should
 * only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByTagName
 * @memberOf module:leadfoot/Element#
 * @since 1.6
 * @param {string} tagName The tag name of the element.
 * @returns {Promise.<module:leadfoot/Element>}
 */

/**
 * Gets the first {@link module:leadfoot/Element#isDisplayed displayed} element inside this element
 * matching the given XPath selector. This is inherently slower than {@link module:leadfoot/Element#find}, so should
 * only be used in cases where the visibility of an element cannot be ensured in advance.
 *
 * @method findDisplayedByXpath
 * @memberOf module:leadfoot/Element#
 * @since 1.6
 * @param {string} path The XPath selector to search for.
 * @returns {Promise.<module:leadfoot/Element>}
 */
findDisplayed.applyTo(Element.prototype);

/**
 * Waits for all elements inside this element that match the given query to be destroyed.
 *
 * @method waitForDeleted
 * @memberOf module:leadfoot/Element#
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
 * Waits for all elements inside this element matching the given CSS class name to be destroyed.
 *
 * @method waitForDeletedByClassName
 * @memberOf module:leadfoot/Element#
 * @param {string} className The CSS class name to search for.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements inside this element matching the given CSS selector to be destroyed.
 *
 * @method waitForDeletedByCssSelector
 * @memberOf module:leadfoot/Element#
 * @param {string} selector The CSS selector to search for.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements inside this element matching the given ID to be destroyed.
 *
 * @method waitForDeletedById
 * @memberOf module:leadfoot/Element#
 * @param {string} id The ID of the element.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements inside this element matching the given name attribute to be destroyed.
 *
 * @method waitForDeletedByName
 * @memberOf module:leadfoot/Element#
 * @param {string} name The name of the element.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements inside this element matching the given case-insensitive link text to be destroyed.
 *
 * @method waitForDeletedByLinkText
 * @memberOf module:leadfoot/Element#
 * @param {string} text The link text of the element.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements inside this element partially matching the given case-insensitive link text to be
 * destroyed.
 *
 * @method waitForDeletedByPartialLinkText
 * @memberOf module:leadfoot/Element#
 * @param {string} text The partial link text of the element.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements inside this element matching the given HTML tag name to be destroyed.
 *
 * @method waitForDeletedByTagName
 * @memberOf module:leadfoot/Element#
 * @param {string} tagName The tag name of the element.
 * @returns {Promise.<void>}
 */

/**
 * Waits for all elements inside this element matching the given XPath selector to be destroyed.
 *
 * @method waitForDeletedByXpath
 * @memberOf module:leadfoot/Element#
 * @param {string} path The XPath selector to search for.
 * @returns {Promise.<void>}
 */
waitForDeleted.applyTo(Element.prototype);

module.exports = Element;
