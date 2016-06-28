'use strict';
var util = require('util');
var onExit = require('signal-exit');
var api = require('./api');
var installed = false;

function outputRejectedMessage(err) {
	if (err instanceof Error) {
		console.error(err.stack);
	} else {
		console.error('Promise rejected with value: ' + util.inspect(err));
	}
}

module.exports = function () {
	if (installed) {
		return;
	}

	installed = true;

	var tracker = api(process);

	onExit(function () {
		var unhandledRejections = tracker.currentlyUnhandled();

		if (unhandledRejections.length > 0) {
			unhandledRejections.forEach(function (x) {
				outputRejectedMessage(x.reason);
			});

			process.exitCode = 1;
		}
	});
};
