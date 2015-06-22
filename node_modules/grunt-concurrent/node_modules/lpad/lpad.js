'use strict';
var eol = require('os').EOL;

var stdoutWrite = process.stdout.write;
var stderrWrite = process.stderr.write;

var lpad = module.exports = function (str, pad) {
	return pad ? pad + String(str).split(eol).join(eol + pad) : str;
};

lpad.stdout = function (pad) {
	process.stdout.write = pad ? function (str) {
		stdoutWrite.call(process.stdout, lpad(str, pad));
	} : stdoutWrite;
};

lpad.stderr = function (pad) {
	process.stderr.write = pad ? function (str) {
		stderrWrite.call(process.stderr, lpad(str, pad));
	} : stderrWrite;
};
