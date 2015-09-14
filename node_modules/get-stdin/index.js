'use strict';

module.exports = function (cb) {
	var ret = '';

	if (process.stdin.isTTY) {
		cb('');
		return;
	}

	process.stdin.setEncoding('utf8');

	process.stdin.on('data', function (chunk) {
		ret += chunk;
	});

	process.stdin.on('end', function () {
		cb(ret);
	});
};

module.exports.buffer = function (cb) {
	var ret = [];
	var len = 0;

	if (process.stdin.isTTY) {
		cb(new Buffer(''));
		return;
	}

	process.stdin.on('data', function (chunk) {
		ret.push(chunk);
		len += chunk.length;
	});

	process.stdin.on('end', function () {
		cb(Buffer.concat(ret, len));
	});
};
