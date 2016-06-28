/**
 * @module leadfoot/helpers/pollUntil
 */

var util = require('../lib/util');

/**
 * A {@link module:leadfoot/Command} helper that polls for a value within the client environment until the value exists
 * or a timeout is reached.
 *
 * @param {Function|string} poller
 * The poller function to execute on an interval. The function should return `null` or `undefined` if there is not a
 * result. If the poller function throws, polling will halt.
 *
 * @param {Array.<any>=} args
 * An array of arguments to pass to the poller function when it is invoked. Only values that can be serialised to JSON,
 * plus {@link module:leadfoot/Element} objects, can be specified as arguments.
 *
 * @param {number=} timeout
 * The maximum amount of time to wait for a successful result, in milliseconds. If not specified, the current
 * `executeAsync` maximum timeout for the session will be used.
 *
 * @param {number=} pollInterval
 * The amount of time to wait between calls to the poller function, in milliseconds. If not specified, defaults to 67ms.
 *
 * @returns {function(): Promise.<any>}
 * A {@link module:leadfoot/Command#then} callback function that, when called, returns a promise that resolves to the
 * value returned by the poller function on success and rejects on failure.
 *
 * @example
 * var Command = require('leadfoot/Command');
 * var pollUntil = require('leadfoot/helpers/pollUntil');
 *
 * new Command(session)
 *     .get('http://example.com')
 *     .then(pollUntil('return document.getElementById("a");', 1000))
 *     .then(function (elementA) {
 *         // element was found
 *     }, function (error) {
 *         // element was not found
 *     });
 *
 * @example
 * var Command = require('leadfoot/Command');
 * var pollUntil = require('leadfoot/helpers/pollUntil');
 *
 * new Command(session)
 *     .get('http://example.com')
 *     .then(pollUntil(function (value) {
 *         var element = document.getElementById('a');
 *         return element && element.value === value ? true : null;
 *     }, [ 'foo' ], 1000))
 *     .then(function () {
 *         // value was set to 'foo'
 *     }, function (error) {
 *         // value was never set
 *     });
 */
module.exports = function (poller, args, timeout, pollInterval) {
	if (typeof args === 'number') {
		pollInterval = timeout;
		timeout = args;
		args = [];
	}

	args = args || [];
	pollInterval = pollInterval || 67;

	return function () {
		var session = this.session;
		var originalTimeout;

		return session.getExecuteAsyncTimeout().then(function () {
			if (!isNaN(timeout)) {
				originalTimeout = arguments[0];
			}
			else {
				timeout = arguments[0];
			}

			return session.setExecuteAsyncTimeout(timeout).then(function () {
				/* jshint maxlen:140 */
				return session.executeAsync(/* istanbul ignore next */ function (poller, args, timeout, pollInterval, done) {
					/* jshint evil:true */
					poller = new Function(poller);

					var endTime = Number(new Date()) + timeout;

					(function poll() {
						var result = poller.apply(this, args);

						/*jshint evil:true */
						if (result != null) {
							done(result);
						}
						else if (Number(new Date()) < endTime) {
							setTimeout(poll, pollInterval);
						}
						else {
							done(null);
						}
					})();
				}, [ util.toExecuteString(poller), args, timeout, pollInterval ]);
			}).finally(function (result) {
				function finish() {
					if (result instanceof Error) {
						throw result;
					}
					else if (result === null) {
						var error = new Error('Polling timed out with no result');
						error.name = 'ScriptTimeout';
						throw error;
					}
					else {
						return result;
					}
				}

				if (!isNaN(originalTimeout)) {
					return session.setExecuteAsyncTimeout(originalTimeout).then(finish);
				}
				else {
					return finish();
				}
			});
		});
	};
};
