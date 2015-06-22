#!/usr/bin/env node
'use strict';
var pkg = require('./package.json');
var latestVersion = require('./index');
var input = process.argv[2];

function help() {
	console.log(pkg.description);
	console.log('');
	console.log('Usage');
	console.log('  $ latest-version <package-name>');
	console.log('');
	console.log('Example');
	console.log('  $ latest-version pageres');
	console.log('  0.2.3');
}

if (!input || process.argv.indexOf('-h') !== -1 || process.argv.indexOf('--help') !== -1) {
	help();
	return;
}

if (process.argv.indexOf('-v') !== -1 || process.argv.indexOf('--version') !== -1) {
	console.log(pkg.version);
	return;
}

latestVersion(input, function (err, version) {
	if (err) {
		console.error(err);
		process.exit(1);
		return;
	}

	console.log(version);
});
