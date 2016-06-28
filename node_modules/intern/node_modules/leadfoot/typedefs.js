/**
 * An error from the remote WebDriver server.
 * @typedef {Object} WebDriverError
 * @extends Error
 *
 * @property {string} name
 * The human-readable error type returned by the WebDriver server. See {@link module:leadfoot/lib/statusCodes} for a
 * list of error types.
 *
 * @property {string} message
 * A human-readable message describing the error.
 *
 * @property {number} status
 * The raw error status code returned by the WebDriver server.
 *
 * @property {Object} detail
 * The raw detail of the error returned by the WebDriver server.
 *
 * @property {{ url: string, method: string, requestData: string }} request
 * The parameters for the request.
 *
 * @property {module:dojo/request.IResponse} response
 * The response object for the request.
 *
 * @property {string} stack
 * The stack trace for the request.
 */

/**
 * An object that describes an HTTP cookie.
 * @typedef {Object} WebDriverCookie
 *
 * @property {string} name
 * The name of the cookie.
 *
 * @property {string} value
 * The value of the cookie.
 *
 * @property {string=} path
 * The registered path for the cookie.
 *
 * @property {string=} domain
 * The registered domain for the cookie.
 *
 * @property {boolean=} secure
 * True if the cookie should only be transmitted over HTTPS.
 *
 * @property {boolean=} httpOnly
 * True if the cookie should be inaccessible to client-side scripting.
 *
 * @property {Date=} expiry
 * The expiration date of the cookie.
 */

/**
 * An object that describes a geographical location.
 * @typedef {Object} Geolocation
 *
 * @property {number} latitude Latitude in WGS84 decimal coordinate system.
 * @property {number} longitude Longitude in WGS84 decimal coordinate system.
 * @property {number=} altitude Altitude in meters above the WGS84 ellipsoid.
 */

/**
 * A remote log entry.
 * @typedef {Object} LogEntry
 *
 * @property {number} timestamp
 * The timestamp of the entry.
 *
 * @property {string} level
 * The severity level of the entry. This level is not currently normalised.
 *
 * @property {string} message
 * The log entry message.
 */

/**
 * A list of possible capabilities for a remote WebDriver environment.
 * @typedef {Object} Capabilities
 *
 * @property {boolean} applicationCacheEnabled
 * Environments with this capability expose the state of the browser’s offline application cache via the WebDriver API.
 *
 * @property {boolean} brokenCookies
 * Environments with this capability are incapable of clearing or deleting cookies. This issue cannot be worked around.
 *
 * @property {boolean} brokenCssTransformedSize
 * Environments with this capability do not correctly retrieve the size of a CSS transformed element. This issue is
 * automatically corrected.
 *
 * @property {boolean} brokenDeleteCookie
 * Environments with this capability do not correctly delete cookies. This issue is automatically corrected for cookies
 * that are accessible via JavaScript.
 *
 * @property {boolean} brokenDoubleClick
 * Environments with this capability do not follow the correct event order when double-clicking. This issue is
 * automatically corrected.
 *
 * @property {boolean} brokenExecuteElementReturn
 * Environments with this capability return invalid element handles from execute functions. This issue cannot be worked
 * around.
 *
 * @property {boolean} brokenElementDisplayedOpacity
 * Environments with this capability claim fully transparent elements are non-hidden. This issue is automatically
 * corrected.
 *
 * @property {boolean} brokenElementDisplayedOffscreen
 * Environments with this capability claim elements positioned offscreen to the top/left of the page are non-hidden.
 * This issue is automatically corrected.
 *
 * @property {boolean} brokenElementPosition
 * Environments with this capability do not correctly retrieve the position of a CSS transformed element. This issue is
 * automatically corrected.
 *
 * @property {boolean} brokenFlickFinger
 * Environments with this capability do not operate correctly when the `flickFinger` method is called. This issue cannot
 * be corrected.
 *
 * @property {boolean} brokenHtmlTagName
 * Environments with this capability return HTML tag names with the incorrect case. This issue is automatically
 * corrected.
 *
 * @property {boolean} brokenLongTap
 * Environments with this capability fail to perform long tap gestures. This issue is not currently corrected.
 *
 * @property {boolean} brokenMouseEvents
 * Environments with this capability have broken mouse event APIs. This issue is automatically corrected as much as
 * possible through JavaScript-based event emulation.
 *
 * @property {boolean} brokenMoveFinger
 * Environments with this capability do not support dragging fingers across the page. This issue is not currently
 * corrected.
 *
 * @property {boolean} brokenNavigation
 * Environments with this capability do not support browser navigation functions (back, forward, refresh). This issue
 * cannot be corrected.
 *
 * @property {boolean} brokenNullGetSpecAttribute
 * Environments with this capability incorrectly return an empty string instead of `null` for attributes that do not
 * exist when using the `getSpecAttribute` retrieval method. This issue is automatically corrected.
 *
 * @property {boolean} brokenRefresh
 * Environments with this capability fail to complete calls to refresh a page through the standard WebDriver API. This
 * issue is automatically corrected.
 *
 * @property {boolean} brokenSendKeys
 * Environments with this capability have broken keyboard event APIs. This issue is automatically corrected as much as
 * possible through JavaScript-based event emulation.
 *
 * @property {boolean} brokenSubmitElement
 * Environments with this capability incorrectly omit the key/value of the button being submitted. This issue is
 * automatically corrected.
 *
 * @property {boolean} brokenTouchScroll
 * Environments with this capability do not operate correctly when the `touchScroll` method is called. This issue is
 * automatically corrected.
 *
 * @property {boolean} brokenWindowSwitch
 * Environments with this capability cannot switch between windows. This issue cannot be corrected.
 *
 * @property {boolean} brokenWindowPosition
 * Environments with this capability break when `setWindowPosition` is called. This issue cannot be corrected.
 *
 * @property {string} browserName
 * The name of the current environment.
 *
 * @property {boolean} cssSelectorsEnabled
 * Environments with this capability can use CSS selectors to find elements.
 *
 * @property {boolean} dynamicViewport
 * Environments with this capability have viewports that can be resized.
 *
 * @property {boolean} fixSessionCapabilities
 * Set this desired capability to false to disable Leadfoot’s feature detection code. This will speed up startup but
 * will disable most Leadfoot fixes, so some environments may stop working correctly.
 *
 * @property {(boolean|string[])} fixedLogTypes
 * Environments with this capability break when the `getLogTypes` method is called. The list of log types provided here
 * are used in lieu of the values provided by the server when calling `getLogTypes`.
 *
 * @property {boolean} javascriptEnabled
 * Environments with this capability have JavaScript enabled. Leadfoot does not operate in environments without
 * JavaScript.
 *
 * @property {boolean} locationContextEnabled
 * Environments with this capability allow the geographic location of the browser to be set and retrieved using the
 * WebDriver API.
 *
 * @property {boolean} mouseEnabled
 * Environments with this capability support interaction via mouse commands.
 *
 * @property {boolean} nativeEvents
 * Environments with this capability use platform native events instead of emulated events.
 *
 * @property {string} platform
 * The name of the platform on which the current environment is running.
 *
 * @property {boolean} remoteFiles
 * Environments with this capability allow files to be uploaded from a remote client.
 *
 * @property {boolean} rotatable
 * Environments with this capability allow the rotation of the device to be set and retrieved using the WebDriver API.
 *
 * @property {string} shortcutKey
 * The special key that is used by default on the given platform to perform keyboard shortcuts.
 *
 * @property {boolean} supportsCssTransforms
 * Environments with this capability support CSS transforms.
 *
 * @property {boolean} supportsExecuteAsync
 * Environments with this capability support asynchronous JavaScript execution.
 *
 * @property {boolean} supportsNavigationDataUris
 * Environments with this capability support navigation to `data:` URIs.
 *
 * @property {boolean} takesScreenshot
 * Environments with this capability allow screenshots of the current screen to be taken.
 *
 * @property {boolean} touchEnabled
 * Environments with this capability support interaction via touch commands.
 *
 * @property {string} version
 * The version number of the current environment.
 *
 * @property {boolean} webStorageEnabled
 * Environments with this capability allow local storage and session storage to be set and retrieved using the
 * WebDriver API.
 */
