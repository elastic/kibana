'use strict';

var BinBuild = require('bin-build');
var BinWrapper = require('bin-wrapper');
var fs = require('fs');
var logSymbols = require('log-symbols');
var path = require('path');
var pkg = require('./package.json');

/**
 * Variables
 */

var BIN_VERSION = '1.3.0';
var BASE_URL = 'https://raw.github.com/imagemin/jpegtran-bin/v' + pkg.version + '/vendor/';

/**
 * Initialize a new BinWrapper
 */

var bin = new BinWrapper()
	.src(BASE_URL + 'osx/jpegtran', 'darwin')
	.src(BASE_URL + 'linux/x86/jpegtran', 'linux', 'x86')
	.src(BASE_URL + 'linux/x64/jpegtran', 'linux', 'x64')
	.src(BASE_URL + 'freebsd/jpegtran', 'freebsd')
	.src(BASE_URL + 'sunos/x86/jpegtran', 'sunos', 'x86')
	.src(BASE_URL + 'sunos/x64/jpegtran', 'sunos', 'x64')
	.src(BASE_URL + 'win/x86/jpegtran.exe', 'win32', 'x86')
	.src(BASE_URL + 'win/x64/jpegtran.exe', 'win32', 'x64')
	.src(BASE_URL + 'win/x86/libjpeg-62.dll', 'win32', 'x86')
	.src(BASE_URL + 'win/x64/libjpeg-62.dll', 'win32', 'x64')
	.dest(path.join(__dirname, 'vendor'))
	.use(process.platform === 'win32' ? 'jpegtran.exe' : 'jpegtran');

/**
 * Only run check if binary doesn't already exist
 */

fs.exists(bin.use(), function (exists) {
	if (!exists) {
		var args = [
			'-copy', 'none',
			'-optimize',
			'-outfile', path.join(__dirname, 'test/fixtures/test-optimized.jpg'),
			path.join(__dirname, 'test/fixtures/test.jpg')
		];

		bin.run(args, function (err) {
			if (err) {
				console.log(logSymbols.warning + ' pre-build test failed, compiling from source...');

				var builder = new BinBuild()
					.src('http://downloads.sourceforge.net/project/libjpeg-turbo/' + BIN_VERSION + '/libjpeg-turbo-' + BIN_VERSION + '.tar.gz')
					.cfg('./configure --disable-shared --prefix="' + bin.dest() + '" --bindir="' + bin.dest() + '"')
					.make('make install');

				return builder.build(function (err) {
					if (err) {
						console.log(logSymbols.error, err);
					}

					console.log(logSymbols.success + ' jpegtran built successfully!');
				});
			}

			console.log(logSymbols.success + ' pre-build test passed successfully!');
		});
	}
});

/**
 * Module exports
 */

module.exports.path = bin.use();
