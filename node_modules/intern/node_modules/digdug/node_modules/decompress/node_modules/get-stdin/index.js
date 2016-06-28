'use strict';
module.exports = function (cb) {
	var ret = '';

	process.stdin.resume();
	process.stdin.setEncoding('utf8');

	process.stdin.on('data', function (data) {
		ret += data;
	});

	process.stdin.on('end', function () {
		cb(ret);
	});
};
