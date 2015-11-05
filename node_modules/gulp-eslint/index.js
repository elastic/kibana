'use strict';

var BufferStreams = require('bufferstreams');
var PluginError = require('gulp-util').PluginError;
var CLIEngine = require('eslint').CLIEngine;
var util = require('./util');

/**
 * Append eslint result to each file
 *
 * @param {(Object|String)} [options] - Configure rules, env, global, and other options for running eslint
 * @returns {stream} gulp file stream
 */
function gulpEslint(options) {
	options = util.migrateOptions(options);
	var linter = new CLIEngine(options);

	function verify(filePath, str) {
		// woot! eslint now supports text processing with localized config files!
		return linter.executeOnText(str, filePath).results[0];
	}

	return util.transform(function(file, enc, cb) {
		// remove base path from file path before calling isPathIgnored
		if (util.isPathIgnored(file, linter.options) || file.isNull()) {
			cb(null, file);

		} else if (file.isStream()) {
			// eslint is synchronous, so wait for the complete contents
			// replace content stream with new readable content stream
			file.contents = file.contents.pipe(new BufferStreams(function(none, buf, done) {
				file.eslint = verify(file.path, String(buf));
				done(null, buf);
				cb(null, file);
			}));

		} else {
			file.eslint = verify(file.path, file.contents.toString());
			cb(null, file);
		}
	});
}

/**
 * Fail when an eslint error is found in eslint results.
 *
 * @returns {stream} gulp file stream
 */
gulpEslint.failOnError = function() {

	return util.transform(function(file, enc, output) {
		var messages = file.eslint && file.eslint.messages || [],
			error = null;

		messages.some(function(message) {
			if (util.isErrorMessage(message)) {
				error = new PluginError(
					'gulp-eslint',
					{
						name: 'ESLintError',
						fileName: file.path,
						message: message.message,
						lineNumber: message.line
					}
				);
				return true;
			}
		});

		return output(error, file);
	});
};

/**
 * Fail when the stream ends if any eslint error(s) occurred
 *
 * @returns {stream} gulp file stream
 */
gulpEslint.failAfterError = function() {
	var errorCount = 0;

	return util.transform(function(file, enc, cb) {
		var messages = file.eslint && file.eslint.messages || [];
		messages.forEach(function(message) {
			if (util.isErrorMessage(message)) {
				errorCount++;
			}
		});
		cb(null, file);
	}, function(cb) {
		// Only format results if files has been lint'd
		if (errorCount > 0) {
			this.emit('error', new PluginError(
				'gulp-eslint',
				{
					name: 'ESLintError',
					message: 'Failed with ' + errorCount + (errorCount === 1 ? ' error' : ' errors')
				}
			));
		}
		cb();
	});
};

/**
 * Wait until all files have been linted and format all results at once.
 *
 * @param {(String|Function)} [formatter=stylish] - The name or function for a eslint result formatter
 * @param {(Function|stream)} [writable=gulp-util.log] - A funtion or stream to write the formatted eslint results.
 * @returns {stream} gulp file stream
 */
gulpEslint.format = function(formatter, writable) {
	var results = [];
	formatter = util.resolveFormatter(formatter);
	writable = util.resolveWritable(writable);

	return util.transform(function(file, enc, cb) {
		if (file.eslint) {
			results.push(file.eslint);
		}
		cb(null, file);
	}, function(cb) {
		// Only format results if files has been lint'd
		if (results.length) {
			util.writeResults(results, formatter, writable);
		}
		// reset buffered results
		results = [];
		cb();
	});
};

/**
 * Format the results of each file individually.
 *
 * @param {(String|Function)} [formatter=stylish] - The name or function for a eslint result formatter
 * @param {(Function|Stream)} [writable=gulp-util.log] - A funtion or stream to write the formatted eslint results.
 * @returns {stream} gulp file stream
 */
gulpEslint.formatEach = function(formatter, writable) {
	formatter = util.resolveFormatter(formatter);
	writable = util.resolveWritable(writable);

	return util.transform(function(file, enc, cb) {
		var error = null;
		if (file.eslint) {
			try {
				util.writeResults([file.eslint], formatter, writable);
			} catch (err) {
				error = new PluginError('gulp-eslint', err);
			}
		}
		cb(error, file);
	});
};

module.exports = gulpEslint;
