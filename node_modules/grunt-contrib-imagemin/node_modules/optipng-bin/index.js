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

var BIN_VERSION = '0.7.5';
var BASE_URL = 'https://raw.github.com/imagemin/optipng-bin/v' + pkg.version + '/vendor/';

/**
 * Initialize a new BinWrapper
 */

var bin = new BinWrapper()
	.src(BASE_URL + 'osx/optipng', 'darwin')
	.src(BASE_URL + 'linux/x86/optipng', 'linux', 'x86')
	.src(BASE_URL + 'linux/x64/optipng', 'linux', 'x64')
	.src(BASE_URL + 'freebsd/optipng', 'freebsd')
	.src(BASE_URL + 'sunos/x86/optipng', 'sunos', 'x86')
	.src(BASE_URL + 'sunos/x64/optipng', 'sunos', 'x64')
	.src(BASE_URL + 'win/optipng.exe', 'win32')
	.dest(path.join(__dirname, 'vendor'))
	.use(process.platform === 'win32' ? 'optipng.exe' : 'optipng');

/**
 * Only run check if binary doesn't already exist
 */

fs.exists(bin.use(), function (exists) {
	if (!exists) {
		bin.run(['--version'], function (err) {
			if (err) {
				console.log(logSymbols.warning + ' pre-build test failed, compiling from source...');

				var builder = new BinBuild()
					.src('http://downloads.sourceforge.net/project/optipng/OptiPNG/optipng-' + BIN_VERSION + '/optipng-' + BIN_VERSION + '.tar.gz')
					.cfg('./configure --with-system-zlib --prefix="' + bin.dest() + '" --bindir="' + bin.dest() + '"')
					.make('make install');

				return builder.build(function (err) {
					if (err) {
						console.log(logSymbols.error, err);
					}

					console.log(logSymbols.success + ' optipng built successfully!');
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
