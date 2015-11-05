#!/usr/bin/env node
'use strict';
var getStdin = require('get-stdin');
var toSingleQuotes = require('./');
var input = process.argv[2];

function init(data) {
	console.log(toSingleQuotes(data));
}

if (process.stdin.isTTY) {
	if (!input) {
		console.error('String required');
		process.exit(1);
	}

	init(input);
} else {
	getStdin(init);
}
