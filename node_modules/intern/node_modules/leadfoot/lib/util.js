/**
 * Common utility methods.
 * @module leadfoot/util
 */

var lang = require('dojo/lang');
var Promise = require('dojo/Promise');

/**
 * Creates a promise that resolves itself after `ms` milliseconds.
 *
 * @param {number} ms Time until resolution in milliseconds.
 * @returns {Promise.<void>}
 */
exports.sleep = function (ms) {
	return new Promise(function (resolve, reject, progress, setCanceller) {
		setCanceller(function (reason) {
			clearTimeout(timer);
			throw reason;
		});

		var timer = setTimeout(function () {
			resolve();
		}, ms);
	});
};

/**
 * Annotates the method with additional properties that provide guidance to {@link module:leadfoot/Command} about
 * how the method interacts with stored context elements.
 *
 * @param {Function} fn
 * @param {{ usesElement: boolean=, createsContext: boolean= }} properties
 * @returns {Function}
 */
exports.forCommand = function (fn, properties) {
	return lang.mixin(fn, properties);
};

/**
 * Converts a function to a string representation suitable for use with the `execute` API endpoint.
 *
 * @param {Function|string} fn
 * @returns {string}
 */
exports.toExecuteString = function (fn) {
	if (typeof fn === 'function') {
		// If someone runs code through Istanbul in the test runner, inline functions that are supposed to execute
		// on the client will contain code coverage variables that will cause script execution failure. These
		// statements are very simple and are generated in a consistent manner, so we can get rid of them easily
		// with a regular expression
		fn = fn.toString().replace(/\b__cov_[^,;]+[,;]/g, '');
		fn = 'return (' + fn + ').apply(this, arguments);';
	}

	return fn;
};

/**
 * Removes the first line of a stack trace, which in V8 is the string representation of the object holding the stack
 * trace (which is garbage for captured stack traces).
 */
exports.trimStack = function (stack) {
	return stack.replace(/^[^\n]+/, '');
};
