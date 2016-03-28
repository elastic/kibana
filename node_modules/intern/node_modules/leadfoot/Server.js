/* global document:false */
/**
 * @module leadfoot/Server
 */

var keys = require('./keys');
var lang = require('dojo/lang');
var Promise = require('dojo/Promise');
var request = require('dojo/request');
var Session = require('./Session');
var statusCodes = require('./lib/statusCodes');
var urlUtil = require('url');
var util = require('./lib/util');

/**
 * Creates a function that performs an HTTP request to a JsonWireProtocol endpoint.
 *
 * @param {string} method The HTTP method to fix.
 * @returns {Function}
 */
function createHttpRequest(method) {
	/**
	 * A function that performs an HTTP request to a JsonWireProtocol endpoint and normalises response status and
	 * data.
	 *
	 * @param {string} path
	 * The path-part of the JsonWireProtocol URL. May contain placeholders in the form `/\$\d/` that will be
	 * replaced by entries in the `pathParts` argument.
	 *
	 * @param {Object} requestData
	 * The payload for the request.
	 *
	 * @param {Array.<string>=} pathParts Optional placeholder values to inject into the path of the URL.
	 *
	 * @returns {Promise.<Object>}
	 */
	return function sendRequest(path, requestData, pathParts) {
		var url = this.url + path.replace(/\$(\d)/, function (_, index) {
			return encodeURIComponent(pathParts[index]);
		});

		var kwArgs = lang.delegate(this.requestOptions, {
			followRedirects: false,
			handleAs: 'text',
			headers: {
				// At least FirefoxDriver on Selenium 2.40.0 will throw a NullPointerException when retrieving
				// session capabilities if an Accept header is not provided. (It is a good idea to provide one
				// anyway)
				'Accept': 'application/json,text/plain;q=0.9'
			},
			method: method
		});

		if (requestData) {
			kwArgs.data = JSON.stringify(requestData);
			kwArgs.headers['Content-Type'] = 'application/json;charset=UTF-8';
			// At least ChromeDriver 2.9.248307 will not process request data if the length of the data is not
			// provided. (It is a good idea to provide one anyway)
			kwArgs.headers['Content-Length'] = Buffer.byteLength(kwArgs.data, 'utf8');
		}
		else {
			// At least Selenium 2.41.0 - 2.42.2 running as a grid hub will throw an exception and drop the current
			// session if a Content-Length header is not provided with a DELETE or POST request, regardless of whether
			// the request actually contains any request data.
			kwArgs.headers['Content-Length'] = 0;
		}

		var trace = {};
		Error.captureStackTrace(trace, sendRequest);

		return request(url, kwArgs).then(function handleResponse(response) {
			/*jshint maxcomplexity:24 */
			// The JsonWireProtocol specification prior to June 2013 stated that creating a new session should
			// perform a 3xx redirect to the session capabilities URL, instead of simply returning the returning
			// data about the session; as a result, we need to follow all redirects to get consistent data
			if (response.statusCode >= 300 && response.statusCode < 400 && response.getHeader('Location')) {
				return request(response.getHeader('Location'), {
					method: 'GET'
				}).then(handleResponse, handleResponse);
			}

			var responseType = response.getHeader('Content-Type');
			var data;

			if (responseType && responseType.indexOf('application/json') === 0 && response.data) {
				data = JSON.parse(response.data);
			}

			// Some drivers will respond to a DELETE request with 204; in this case, we know the operation
			// completed successfully, so just create an expected response data structure for a successful
			// operation to avoid any special conditions elsewhere in the code caused by different HTTP return
			// values
			if (response.statusCode === 204) {
				data = {
					status: 0,
					sessionId: null,
					value: null
				};
			}
			else if (response.statusCode >= 400 || (data && data.status > 0)) {
				var error = new Error();

				// "The client should interpret a 404 Not Found response from the server as an "Unknown command"
				// response. All other 4xx and 5xx responses from the server that do not define a status field
				// should be interpreted as "Unknown error" responses."
				// - http://code.google.com/p/selenium/wiki/JsonWireProtocol#Response_Status_Codes
				if (!data) {
					data = {
						status: response.statusCode === 404 || response.statusCode === 501 ? 9 : 13,
						value: {
							message: response.text
						}
					};
				}
				// ios-driver 0.6.6-SNAPSHOT April 2014 incorrectly implements the specification: does not return
				// error data on the `value` key, and does not return the correct HTTP status for unknown commands
				else if (!data.value && ('message' in data)) {
					data = {
						status: response.statusCode === 404 || response.statusCode === 501 ||
							data.message.indexOf('cannot find command') > -1 ? 9 : 13,
						value: data
					};
				}

				// At least Appium April 2014 responds with the HTTP status Not Implemented but a Selenium
				// status UnknownError for commands that are not implemented; these errors are more properly
				// represented to end-users using the Selenium status UnknownCommand, so we make the appropriate
				// coercion here
				if (response.statusCode === 501 && data.status === 13) {
					data.status = 9;
				}

				// At least FirefoxDriver 2.40.0 responds with HTTP status codes other than Not Implemented and a
				// Selenium status UnknownError for commands that are not implemented; however, it provides a
				// reliable indicator that the operation was unsupported by the type of the exception that was
				// thrown, so also coerce this back into an UnknownCommand response for end-user code
				if (data.status === 13 && data.value && data.value.class &&
					(data.value.class.indexOf('UnsupportedOperationException') > -1 ||
					data.value.class.indexOf('UnsupportedCommandException') > -1)
				) {
					data.status = 9;
				}

				// At least InternetExplorerDriver 2.41.0 & SafariDriver 2.41.0 respond with HTTP status codes
				// other than Not Implemented and a Selenium status UnknownError for commands that are not
				// implemented; like FirefoxDriver they provide a reliable indicator of unsupported commands
				if (response.statusCode === 500 && data.value &&
					(
						data.value.message.indexOf('Command not found') > -1 ||
						data.value.message.indexOf('Unknown command') > -1
					)
				) {
					data.status = 9;
				}

				// At least GhostDriver 1.1.0 incorrectly responds with HTTP 405 instead of HTTP 501 for
				// unimplemented commands
				if (response.statusCode === 405 && data.value &&
					data.value.message.indexOf('Invalid Command Method') > -1
				) {
					data.status = 9;
				}

				var statusText = statusCodes[data.status];
				if (statusText) {
					error.name = statusText[0];
					error.message = statusText[1];
				}

				if (data.value && data.value.message) {
					error.message = data.value.message;
				}

				if (data.value && data.value.screen) {
					data.value.screen = new Buffer(data.value.screen, 'base64');
				}

				error.status = data.status;
				error.detail = data.value;
				error.request = {
					url: url,
					method: method,
					data: requestData
				};
				error.response = response;

				var sanitizedUrl = (function () {
					var parsedUrl = urlUtil.parse(url);
					if (parsedUrl.auth) {
						parsedUrl.auth = '(redacted)';
					}

					return urlUtil.format(parsedUrl);
				})();

				error.message = '[' + method + ' ' + sanitizedUrl +
					(requestData ? ' / ' + JSON.stringify(requestData) : '') +
					'] ' + error.message;
				error.stack = error.message + util.trimStack(trace.stack);

				throw error;
			}

			return data;
		}, function (error) {
			error.stack = error.message + util.trimStack(trace.stack);
			throw error;
		});
	};
}

/**
 * Returns the actual response value from the remote environment.
 *
 * @param {Object} response JsonWireProtocol response object.
 * @returns {any} The actual response value.
 */
function returnValue(response) {
	return response.value;
}

/**
 * The Server class represents a remote HTTP server implementing the WebDriver wire protocol that can be used to
 * generate new remote control sessions.
 *
 * @constructor module:leadfoot/Server
 * @param {(Object|string)} url
 * The fully qualified URL to the JsonWireProtocol endpoint on the server. The default endpoint for a
 * JsonWireProtocol HTTP server is http://localhost:4444/wd/hub. You may also pass a parsed URL object which will
 * be converted to a string.
 * @param {{ proxy: string }=} options
 * Additional request options to be used for requests to the server.
 */
function Server(url, options) {
	if (typeof url === 'object') {
		url = Object.create(url);
		if (url.username || url.password || url.accessKey) {
			url.auth = encodeURIComponent(url.username) + ':' + encodeURIComponent(url.password || url.accessKey);
		}
	}

	this.url = urlUtil.format(url).replace(/\/*$/, '/');
	this.requestOptions = options || {};
}

/**
 * @lends module:leadfoot/Server#
 */
Server.prototype = {
	constructor: Server,

	/**
	 * An alternative session constructor. Defaults to the standard {@link module:leadfoot/Session} constructor if
	 * one is not provided.
	 *
	 * @type {module:leadfoot/Session}
	 * @default Session
	 */
	sessionConstructor: Session,

	/**
	 * Whether or not to perform capabilities testing and correction when creating a new Server.
	 * @type {boolean}
	 * @default
	 */
	fixSessionCapabilities: true,

	_get: createHttpRequest('GET'),
	_post: createHttpRequest('POST'),
	_delete: createHttpRequest('DELETE'),

	/**
	 * Gets the status of the remote server.
	 *
	 * @returns {Promise.<Object>} An object containing arbitrary properties describing the status of the remote
	 * server.
	 */
	getStatus: function () {
		return this._get('status').then(returnValue);
	},

	/**
	 * Creates a new remote control session on the remote server.
	 *
	 * @param {Capabilities} desiredCapabilities
	 * A hash map of desired capabilities of the remote environment. The server may return an environment that does
	 * not match all the desired capabilities if one is not available.
	 *
	 * @param {Capabilities=} requiredCapabilities
	 * A hash map of required capabilities of the remote environment. The server will not return an environment that
	 * does not match all the required capabilities if one is not available.
	 *
	 * @returns {Promise.<module:leadfoot/Session>}
	 */
	createSession: function (desiredCapabilities, requiredCapabilities) {
		var self = this;

		var fixSessionCapabilities = desiredCapabilities.fixSessionCapabilities !== false &&
			self.fixSessionCapabilities;

		// Don’t send `fixSessionCapabilities` to the server
		if ('fixSessionCapabilities' in desiredCapabilities) {
			desiredCapabilities = lang.mixin({}, desiredCapabilities);
			desiredCapabilities.fixSessionCapabilities = undefined;
		}

		return this._post('session', {
			desiredCapabilities: desiredCapabilities,
			requiredCapabilities: requiredCapabilities
		}).then(function (response) {
			var session = new self.sessionConstructor(response.sessionId, self, response.value);
			if (fixSessionCapabilities) {
				return self._fillCapabilities(session).catch(function (error) {
					// The session was started on the server, but we did not resolve the Promise yet. If a failure
					// occurs during capabilities filling, we should quit the session on the server too since the
					// caller will not be aware that it ever got that far and will have no access to the session to
					// quit itself.
					return session.quit().finally(function () {
						throw error;
					});
				});
			}
			else {
				return session;
			}
		});
	},

	_fillCapabilities: function (session) {
		/*jshint maxlen:140 */
		var capabilities = session.capabilities;

		function supported() { return true; }
		function unsupported() { return false; }
		function maybeSupported(error) { return error.name !== 'UnknownCommand'; }
		var broken = supported;
		var works = unsupported;

		/**
		 * Adds the capabilities listed in the `testedCapabilities` object to the hash of capabilities for
		 * the current session. If a tested capability value is a function, it is assumed that it still needs to
		 * be executed serially in order to resolve the correct value of that particular capability.
		 */
		function addCapabilities(testedCapabilities) {
			return new Promise(function (resolve, reject) {
				var keys = Object.keys(testedCapabilities);
				var i = 0;

				(function next() {
					var key = keys[i++];

					if (!key) {
						resolve();
						return;
					}

					var value = testedCapabilities[key];

					if (typeof value === 'function') {
						value().then(function (value) {
							capabilities[key] = value;
							next();
						}, reject);
					}
					else {
						capabilities[key] = value;
						next();
					}
				})();
			});
		}

		function get(page) {
			if (capabilities.supportsNavigationDataUris !== false) {
				return session.get('data:text/html;charset=utf-8,' + encodeURIComponent(page));
			}

			// Internet Explorer 9 and earlier hang when attempting to do navigate after a `document.write` is
			// performed to reset the tab content; we can still do some limited testing in these browsers by using
			// the initial browser URL page and injecting some content through innerHTML, though it is unfortunately
			// a quirks-mode file so testing is limited
			if (capabilities.browserName === 'internet explorer' && parseFloat(capabilities.version) < 10) {
				return session.get(capabilities.initialBrowserUrl).then(function () {
					return session.execute('document.body.innerHTML = arguments[0];', [
						// The DOCTYPE does not apply, for obvious reasons, but also old IE will discard invisible
						// elements like `<script>` and `<style>` if they are the first elements injected with
						// `innerHTML`, so an extra text node is added before the rest of the content instead
						page.replace('<!DOCTYPE html>', 'x')
					]);
				});
			}

			return session.get('about:blank').then(function () {
				return session.execute('document.write(arguments[0]);', [ page ]);
			});
		}

		function discoverFeatures() {
			var testedCapabilities = {};

			// SafariDriver 2.41.0 fails to allow stand-alone feature testing because it does not inject user
			// scripts for URLs that are not http/https
			if (capabilities.browserName === 'safari' && capabilities.platform === 'MAC') {
				return {
					nativeEvents: false,
					rotatable: false,
					locationContextEnabled: false,
					webStorageEnabled: false,
					applicationCacheEnabled: false,
					supportsNavigationDataUris: true,
					supportsCssTransforms: true,
					supportsExecuteAsync: true,
					mouseEnabled: true,
					touchEnabled: false,
					dynamicViewport: true,
					shortcutKey: keys.COMMAND
				};
			}

			// Appium iOS as of April 2014 supports rotation but does not specify the capability
			if (!('rotatable' in capabilities)) {
				testedCapabilities.rotatable = session.getOrientation().then(supported, unsupported);
			}

			// At least FirefoxDriver 2.40.0 and ios-driver 0.6.0 claim they support geolocation in their returned
			// capabilities map, when they do not
			if (capabilities.locationContextEnabled) {
				testedCapabilities.locationContextEnabled = session.getGeolocation()
					.then(supported, function (error) {
						return error.name !== 'UnknownCommand' &&
							error.message.indexOf('not mapped : GET_LOCATION') === -1;
					});
			}

			// At least FirefoxDriver 2.40.0 claims it supports web storage in the returned capabilities map, when
			// it does not
			if (capabilities.webStorageEnabled) {
				testedCapabilities.webStorageEnabled = session.getLocalStorageLength()
					.then(supported, maybeSupported);
			}

			// At least FirefoxDriver 2.40.0 claims it supports application cache in the returned capabilities map,
			// when it does not
			if (capabilities.applicationCacheEnabled) {
				testedCapabilities.applicationCacheEnabled = session.getApplicationCacheStatus()
					.then(supported, maybeSupported);
			}

			// At least Selendroid 0.9.0 will fail to take screenshots in certain device configurations, usually
			// emulators with hardware acceleration enabled
			testedCapabilities.takesScreenshot = session.takeScreenshot().then(supported, unsupported);

			// At least ios-driver 0.6.6-SNAPSHOT April 2014 does not support execute_async
			testedCapabilities.supportsExecuteAsync = session.executeAsync('arguments[0](true);').catch(unsupported);

			// Some additional, currently-non-standard capabilities are needed in order to know about supported
			// features of a given platform
			if (!('mouseEnabled' in capabilities)) {
				testedCapabilities.mouseEnabled = session.doubleClick()
					.then(supported, maybeSupported);
			}

			if (!('touchEnabled' in capabilities)) {
				testedCapabilities.touchEnabled = session.longTap()
					.then(supported, maybeSupported);
			}

			if (!('dynamicViewport' in capabilities)) {
				testedCapabilities.dynamicViewport = session.getWindowSize().then(function (originalSize) {
					return session.setWindowSize(originalSize.width, originalSize.height);
				}).then(supported, unsupported);
			}

			// At least Internet Explorer 11 and earlier do not allow data URIs to be used for navigation
			testedCapabilities.supportsNavigationDataUris = function () {
				return get('<!DOCTYPE html><title>a</title>').then(function () {
					return session.getPageTitle();
				}).then(function (pageTitle) {
					return pageTitle === 'a';
				}).catch(unsupported);
			};
			testedCapabilities.supportsCssTransforms = function () {
				// It is not possible to test this since the feature tests runs in quirks-mode on IE<10, but we
				// know that IE9 supports CSS transforms
				if (capabilities.browserName === 'internet explorer' && parseFloat(capabilities.version) === 9) {
					return Promise.resolve(true);
				}

				/*jshint maxlen:240 */
				return get('<!DOCTYPE html><style>#a{width:8px;height:8px;-ms-transform:scale(0.5);-moz-transform:scale(0.5);-webkit-transform:scale(0.5);transform:scale(0.5);}</style><div id="a"></div>').then(function () {
					return session.execute(/* istanbul ignore next */ function () {
						var bbox = document.getElementById('a').getBoundingClientRect();
						return bbox.right - bbox.left === 4;
					});
				}).catch(unsupported);
			};

			testedCapabilities.shortcutKey = (function () {
				var platform = capabilities.platform.toLowerCase();

				if (platform.indexOf('mac') === 0) {
					return keys.COMMAND;
				}

				if (platform.indexOf('ios') === 0) {
					return null;
				}

				return keys.CONTROL;
			})();

			return Promise.all(testedCapabilities);
		}

		function discoverDefects() {
			var testedCapabilities = {};

			// SafariDriver 2.41.0 fails to allow stand-alone feature testing because it does not inject user
			// scripts for URLs that are not http/https
			if (capabilities.browserName === 'safari' && capabilities.platform === 'MAC') {
				return {
					brokenDeleteCookie: false,
					brokenExecuteElementReturn: false,
					brokenElementDisplayedOpacity: false,
					brokenElementDisplayedOffscreen: false,
					brokenSubmitElement: true,
					brokenWindowSwitch: true,
					brokenDoubleClick: false,
					brokenCssTransformedSize: true,
					fixedLogTypes: false,
					brokenHtmlTagName: false,
					brokenNullGetSpecAttribute: false,

					// SafariDriver-specific
					brokenNavigation: true,
					brokenMouseEvents: true,
					brokenWindowPosition: true,
					brokenSendKeys: true,

					// SafariDriver 2.41.0 cannot delete cookies, at all, ever
					brokenCookies: true
				};
			}

			// Internet Explorer 8 and earlier will simply crash the server if we attempt to return the parent
			// frame via script, so never even attempt to do so
			testedCapabilities.scriptedParentFrameCrashesBrowser =
				capabilities.browserName === 'internet explorer' && parseFloat(capabilities.version) < 9;

			// At least Selendroid 0.9.0 has broken cookie deletion; nobody else has broken cookie deletion but
			// this test is very hard to get working properly in other environments so only test when Selendroid
			// is the browser
			if (capabilities.browserName === 'selendroid') {
				testedCapabilities.brokenDeleteCookie = function () {
					return session.get('about:blank').then(function () {
						return session.clearCookies();
					}).then(function () {
						return session.setCookie({ name: 'foo', value: 'foo' });
					}).then(function () {
						return session.deleteCookie('foo');
					}).then(function () {
						return session.getCookies();
					}).then(function (cookies) {
						return cookies.length > 0;
					}).catch(function () {
						return true;
					}).then(function (isBroken) {
						return session.clearCookies().finally(function () {
							return isBroken();
						});
					});
				};
			}

			// At least Selendroid 0.9.0 incorrectly returns HTML tag names in uppercase, which is a violation
			// of the JsonWireProtocol spec
			testedCapabilities.brokenHtmlTagName = session.findByTagName('html').then(function (element) {
				return element.getTagName();
			}).then(function (tagName) {
				return tagName !== 'html';
			}).catch(broken);

			// At least ios-driver 0.6.6-SNAPSHOT incorrectly returns empty string instead of null for attributes
			// that do not exist
			testedCapabilities.brokenNullGetSpecAttribute = session.findByTagName('html').then(function (element) {
				return element.getSpecAttribute('nonexisting');
			}).then(function (value) {
				return value !== null;
			}).catch(broken);

			// At least Selendroid 0.9.0 always returns invalid element handles from JavaScript
			testedCapabilities.brokenExecuteElementReturn = function () {
				return get('<!DOCTYPE html><div id="a"></div>').then(function () {
					return session.execute('return document.getElementById("a");');
				}).then(function (element) {
					return element && element.getTagName();
				}).then(works, broken);
			};

			// At least Selendroid 0.9.0 treats fully transparent elements as displayed, but all others do not
			testedCapabilities.brokenElementDisplayedOpacity = function () {
				return get('<!DOCTYPE html><div id="a" style="opacity: .1;">a</div>').then(function () {
					// IE<9 do not support CSS opacity so should not be involved in this test
					return session.execute('var o = document.getElementById("a").style.opacity; return o && o.charAt(0) === "0";');
				}).then(function (supportsOpacity) {
					if (!supportsOpacity) {
						return works();
					}
					else {
						return session.execute('document.getElementById("a").style.opacity = "0";')
							.then(function () {
								return session.findById('a');
							})
							.then(function (element) {
								return element.isDisplayed();
							});
					}
				}).catch(broken);
			};

			// At least ChromeDriver 2.9 treats elements that are offscreen as displayed, but others do not
			testedCapabilities.brokenElementDisplayedOffscreen = function () {
				return get('<!DOCTYPE html><div id="a" style="left: 0; position: absolute; top: -1000px;">a</div>').then(function () {
					return session.findById('a');
				}).then(function (element) {
					return element.isDisplayed();
				}).catch(broken);
			};

			// There is inconsistency across all drivers as to whether or not submitting a form button should cause
			// the form button to be submitted along with the rest of the form; it seems most likely that tests
			// do want the specified button to act as though someone clicked it when it is submitted, so the
			// behaviour needs to be normalised
			testedCapabilities.brokenSubmitElement = function () {
				/*jshint maxlen:200 */
				return get('<!DOCTYPE html><form method="get" action="about:blank"><input id="a" type="submit" name="a" value="a"></form>').then(function () {
					return session.findById('a');
				}).then(function (element) {
					return element.submit();
				}).then(function () {
					return session.getCurrentUrl();
				}).then(function (url) {
					return url.indexOf('a=a') === -1;
				}).catch(broken);
			};

			// At least Selendroid 0.9.0 has a bug where it catastrophically fails to retrieve available types;
			// they have tried to hardcode the available log types in this version so we can just return the
			// same hardcoded list ourselves;
			// At least InternetExplorerDriver 2.41.0 also fails to provide log types
			testedCapabilities.fixedLogTypes = session.getAvailableLogTypes().then(unsupported, function (error) {
				if (capabilities.browserName === 'selendroid' && !error.response.text.length) {
					return [ 'logcat' ];
				}

				return [];
			});

			// At least ios-driver 0.6.6-SNAPSHOT April 2014 corrupts its internal state when performing window
			// switches and gets permanently stuck; we cannot feature detect, so platform sniffing it is
			testedCapabilities.brokenWindowSwitch = capabilities.browserName === 'Safari' &&
				capabilities.platformName === 'IOS';

			var scrollTestUrl = '<!DOCTYPE html><div id="a" style="margin: 3000px;"></div>';

			// ios-driver 0.6.6-SNAPSHOT April 2014 calculates position based on a bogus origin and does not
			// account for scrolling
			testedCapabilities.brokenElementPosition = function () {
				return get(scrollTestUrl).then(function () {
					return session.findById('a');
				}).then(function (element) {
					return element.getPosition();
				}).then(function (position) {
					return position.x !== 3000 || position.y !== 3000;
				}).catch(broken);
			};

			// At least ios-driver 0.6.6-SNAPSHOT April 2014 will never complete a refresh call
			testedCapabilities.brokenRefresh = function () {
				return session.get('about:blank?1').then(function () {
					return new Promise(function (resolve, reject, progress, setCanceler) {
						function cleanup() {
							clearTimeout(timer);
							refresh.cancel();
						}

						setCanceler(cleanup);

						var refresh = session.refresh().then(function () {
							cleanup();
							resolve(false);
						}, function () {
							cleanup();
							resolve(true);
						});

						var timer = setTimeout(function () {
							cleanup();
						}, 2000);
					});
				}).catch(broken);
			};

			if (capabilities.mouseEnabled) {
				// At least ChromeDriver 2.9.248307 does not correctly emit the entire sequence of events that would
				// normally occur during a double-click
				testedCapabilities.brokenDoubleClick = function retry() {
					/*jshint maxlen:200 */

					// InternetExplorerDriver is not buggy, but IE9 in quirks-mode is; since we cannot do feature
					// tests in standards-mode in IE<10, force the value to false since it is not broken in this
					// browser
					if (capabilities.browserName === 'internet explorer' && capabilities.version === '9') {
						return Promise.resolve(false);
					}

					return get('<!DOCTYPE html><script>counter = 0; var d = document; d.onclick = d.onmousedown = d.onmouseup = function () { counter++; };</script>').then(function () {
						return session.findByTagName('html');
					}).then(function (element) {
						return session.moveMouseTo(element);
					}).then(function () {
						return util.sleep(100);
					}).then(function () {
						return session.doubleClick();
					}).then(function () {
						return session.execute('return counter;');
					}).then(function (counter) {
						// InternetExplorerDriver 2.41.0 has a race condition that makes this test sometimes fail
						/* istanbul ignore if: inconsistent race condition */
						if (counter === 0) {
							return retry();
						}

						return counter !== 6;
					}).catch(broken);
				};
			}

			if (capabilities.touchEnabled) {
				// At least Selendroid 0.9.0 fails to perform a long tap due to an INJECT_EVENTS permission failure
				testedCapabilities.brokenLongTap = session.findByTagName('body').then(function (element) {
					return session.longTap(element);
				}).then(works, broken);

				// At least ios-driver 0.6.6-SNAPSHOT April 2014 claims to support touch press/move/release but
				// actually fails when you try to use the commands
				testedCapabilities.brokenMoveFinger = session.pressFinger(0, 0).then(works, function (error) {
					return error.name === 'UnknownCommand' || error.message.indexOf('need to specify the JS') > -1;
				});

				// Touch scroll in ios-driver 0.6.6-SNAPSHOT is broken, does not scroll at all;
				// in selendroid 0.9.0 it ignores the element argument
				testedCapabilities.brokenTouchScroll = function () {
					return get(scrollTestUrl).then(function () {
						return session.touchScroll(0, 20);
					}).then(function () {
						return session.execute('return window.scrollY !== 20;');
					}).then(function (isBroken) {
						if (isBroken) {
							return true;
						}

						return session.findById('a').then(function (element) {
							return session.touchScroll(element, 0, 0);
						}).then(function () {
							return session.execute('return window.scrollY !== 3000;');
						});
					})
					.catch(broken);
				};

				// Touch flick in ios-driver 0.6.6-SNAPSHOT is broken, does not scroll at all except in very
				// broken ways if very tiny speeds are provided and the flick goes in the wrong direction
				testedCapabilities.brokenFlickFinger = function () {
					return get(scrollTestUrl).then(function () {
						return session.flickFinger(0, 400);
					}).then(function () {
						return session.execute('return window.scrollY === 0;');
					})
					.catch(broken);
				};
			}

			if (capabilities.supportsCssTransforms) {
				testedCapabilities.brokenCssTransformedSize = function () {
					/*jshint maxlen:240 */
					return get('<!DOCTYPE html><style>#a{width:8px;height:8px;-ms-transform:scale(0.5);-moz-transform:scale(0.5);-webkit-transform:scale(0.5);transform:scale(0.5);}</style><div id="a"></div>').then(function () {
						return session.execute('return document.getElementById("a");').then(function (element) {
							return element.getSize();
						}).then(function (dimensions) {
							return dimensions.width !== 4 || dimensions.height !== 4;
						});
					}).catch(broken);
				};
			}

			return Promise.all(testedCapabilities);
		}

		function discoverServerFeatures() {
			var testedCapabilities = {};

			/* jshint maxlen:300 */
			testedCapabilities.remoteFiles = function () {
				return session._post('file', {
					file: 'UEsDBAoAAAAAAD0etkYAAAAAAAAAAAAAAAAIABwAdGVzdC50eHRVVAkAA2WnXlVlp15VdXgLAAEE8gMAAATyAwAAUEsBAh4DCgAAAAAAPR62RgAAAAAAAAAAAAAAAAgAGAAAAAAAAAAAAKSBAAAAAHRlc3QudHh0VVQFAANlp15VdXgLAAEE8gMAAATyAwAAUEsFBgAAAAABAAEATgAAAEIAAAAAAA=='
				}).then(function (filename) {
					return filename && filename.indexOf('test.txt') > -1;
				}).catch(unsupported);
			};

			return Promise.all(testedCapabilities);
		}

		return session.get('about:blank')
			.then(discoverServerFeatures)
			.then(addCapabilities)
			.then(discoverFeatures)
			.then(addCapabilities)
			.then(function () {
				return session.get('about:blank');
			})
			.then(discoverDefects)
			.then(addCapabilities)
			.finally(function () {
				return session.get('about:blank').finally(function () {
					return session;
				});
			});
	},

	/**
	 * Gets a list of all currently active remote control sessions on this server.
	 *
	 * @returns {Promise.<Object[]>}
	 */
	getSessions: function () {
		return this._get('sessions').then(returnValue);
	},

	/**
	 * Gets information on the capabilities of a given session from the server. The list of capabilities returned
	 * by this command will not include any of the extra session capabilities detected by Leadfoot and may be
	 * inaccurate.
	 *
	 * @param {string} sessionId
	 * @returns {Promise.<Object>}
	 */
	getSessionCapabilities: function (sessionId) {
		return this._get('session/$0', null, [ sessionId ]).then(returnValue);
	},

	/**
	 * Terminates a session on the server.
	 *
	 * @param {string} sessionId
	 * @returns {Promise.<void>}
	 */
	deleteSession: function (sessionId) {
		return this._delete('session/$0', null, [ sessionId ]).then(returnValue);
	}
};

module.exports = Server;
