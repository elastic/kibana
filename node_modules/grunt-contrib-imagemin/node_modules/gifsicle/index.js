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

var BIN_VERSION = '1.83';
var BASE_URL = 'https://raw.github.com/imagemin/gifsicle-bin/v' + pkg.version + '/vendor/';

/**
 * Initialize a new BinWrapper
 */

var bin = new BinWrapper()
	.src(BASE_URL + 'osx/gifsicle', 'darwin')
	.src(BASE_URL + 'linux/x86/gifsicle', 'linux', 'x86')
	.src(BASE_URL + 'linux/x64/gifsicle', 'linux', 'x64')
	.src(BASE_URL + 'freebsd/x86/gifsicle', 'freebsd', 'x86')
	.src(BASE_URL + 'freebsd/x64/gifsicle', 'freebsd', 'x64')
	.src(BASE_URL + 'win/x86/gifsicle.exe', 'win32', 'x86')
	.src(BASE_URL + 'win/x86/gifsicle.exe', 'win32', 'x64')
	.dest(path.join(__dirname, 'vendor'))
	.use(process.platform === 'win32' ? 'gifsicle.exe' : 'gifsicle');

/**
 * Only run check if binary doesn't already exist
 */

fs.exists(bin.use(), function (exists) {
	if (!exists) {
		bin.run(['--version'], function (err) {
			if (err) {
				console.log(logSymbols.warning + ' pre-build test failed, compiling from source...');

				var builder = new BinBuild()
					.src('http://www.lcdf.org/gifsicle/gifsicle-' + BIN_VERSION + '.tar.gz')
					.cfg('./configure --disable-gifview --disable-gifdiff --prefix="' + bin.dest() + '" --bindir="' + bin.dest() + '"')
					.make('make install');

				return builder.build(function (err) {
					if (err) {
						console.log(logSymbols.error, err);
					}

					console.log(logSymbols.success + ' gifsicle built successfully!');
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
