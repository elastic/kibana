'use strict';

var BinWrapper = require('bin-wrapper');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');

/**
 * Initialize a new BinWrapper
 */

var bin = new BinWrapper({ bin: 'pngquant', dest: path.join(__dirname, 'vendor') });
var bs = 'make install BINPREFIX="' + bin.dest + '"';

/**
 * Only run check if binary doesn't already exist
 */

fs.exists(bin.path, function (exists) {
	if (!exists) {
		bin
			.addUrl('https://raw.github.com/sindresorhus/node-pngquant-bin/v0.1.7/vendor/osx/pngquant', 'darwin')
			.addUrl('https://raw.github.com/sindresorhus/node-pngquant-bin/v0.1.7/vendor/linux/x86/pngquant', 'linux', 'x86')
			.addUrl('https://raw.github.com/sindresorhus/node-pngquant-bin/v0.1.7/vendor/linux/x64/pngquant', 'linux', 'x64')
			.addUrl('https://raw.github.com/sindresorhus/node-pngquant-bin/v0.1.7/vendor/win/pngquant.exe', 'win32')
			.addSource('https://github.com/pornel/pngquant/archive/2.0.0.tar.gz')
			.check()
			.on('error', function (err) {
				console.log(chalk.red('✗ ' + err.message));
			})
			.on('fail', function () {
				if (process.platform === 'win32') {
					return console.log(chalk.red('✗ building is not supported on ' + process.platform));
				}

				console.log(chalk.red('✗ pre-build test failed, compiling from source...'));

				this.build(bs);
			})
			.on('success', function () {
				console.log(chalk.green('✓ pre-build test passed successfully'));
			})
			.on('finish', function () {
				console.log(chalk.green('✓ pngquant rebuilt successfully'));
			});
	}
});

/**
 * Module exports
 */

module.exports.path = bin.path;
