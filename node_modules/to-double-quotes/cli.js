#!/usr/bin/env node
'use strict';
var getStdin = require('get-stdin');
var meow = require('meow');
var toDoubleQuotes = require('./');

var cli = meow({
	help: [
		'Usage',
		'  $ to-double-quotes <string>',
		'  $ echo <string> | to-double-quotes',
		'',
		'Example',
		'  $ to-double-quotes "I love \'unicorns\'"',
		'  I love "unicorns"'
	].join('\n')
});

function init(data) {
	console.log(toDoubleQuotes(data));
}

if (process.stdin.isTTY) {
	if (!cli.input[0]) {
		console.error('String required');
		process.exit(1);
	}

	init(cli.input[0]);
} else {
	getStdin(init);
}
