#!/usr/bin/env node
'use strict';
var fs = require('fs');
var getUrls = require('./get-urls');
var input = process.argv[2];

function stdin(cb) {
	var ret = '';
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', function (data) { ret += data });
	process.stdin.on('end', function () { cb(ret) }).resume();
}

function help() {
	console.log('get-urls <input-file>');
	console.log('or');
	console.log('cat <input-file> | get-urls');
}

if (process.argv.indexOf('-h') !== -1 || process.argv.indexOf('--help') !== -1) {
	help();
	return;
}

if (process.argv.indexOf('-v') !== -1 || process.argv.indexOf('--version') !== -1) {
	console.log(require('./package').version);
	return;
}

if (process.stdin.isTTY) {
	if (!input) {
		return help();
	}

	console.log(getUrls(fs.readFileSync(input, 'utf8')).join('\n'));
} else {
	stdin(function (data) {
		console.log(getUrls(data).join('\n'));
	});
}
