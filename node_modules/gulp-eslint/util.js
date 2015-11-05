'use strict';

var path = require('path'),
	TransformStream = require('stream').Transform,
	gutil = require('gulp-util'),
	objectAssign = require('object-assign'),
	CLIEngine = require('eslint').CLIEngine,
	esUtil = require('eslint/lib/util'),
	IgnoredPaths = require('eslint/lib/ignored-paths'),
	FileFinder = require('eslint/lib/file-finder');

var ignoreFileFinder = new FileFinder('.eslintignore');

/**
 * Convenience method for creating a transform stream in object mode
 *
 * @param {Function} transform - An async function that is called for each stream chunk
 * @param {Function} [flush] - An async function that is called before closing the stream
 * @returns {stream} A transform stream
 */
exports.transform = function(transform, flush) {
	var stream = new TransformStream({
		objectMode: true
	});
	stream._transform = transform;
	if (typeof flush === 'function') {
		stream._flush = flush;
	}
	return stream;
};

/**
 * Mimic the CLIEngine.isPathIgnored,
 * but resolve .eslintignore based on file's directory rather than process.cwd()
 *
 * @param {Object} file - file with a "path" property
 * @param {Object} options - linter options
 * @returns {Boolean} Whether the path is ignored
 */
exports.isPathIgnored = function(file, options) {
	var filePath;
	if (!options.ignore) {
		return false;
	}
	if (typeof options.ignorePath !== 'string') {
		options = {
			ignore: true,
			ignorePath: ignoreFileFinder.findInDirectoryOrParents(path.dirname(file.path || ''))
		};
	}
	// set file path relative to the .eslintignore directory or cwd
	filePath = path.relative(
		path.dirname(options.ignorePath || '') || process.cwd(),
		file.path || ''
	);
	return IgnoredPaths.load(options).contains(filePath);
};

/**
 * Create config helper to merge various config sources
 *
 * @param {Object} options - options to migrate
 * @returns {Object} migrated options
 */
exports.migrateOptions = function migrateOptions(options) {
	if (typeof options === 'string') {
		// basic config path overload: gulpEslint('path/to/config.json')
		options = {
			configFile: options
		};
	} else {
		options = objectAssign({}, options);
	}

	options.globals = options.globals || options.global;
	if (options.globals != null && !Array.isArray(options.globals)) {
		options.globals = Object.keys(options.globals).map(function cliGlobal(key) {
			return options.globals[key] ? key + ':true' : key;
		});
	}

	options.envs = options.envs || options.env;
	if (options.envs != null && !Array.isArray(options.envs)) {
		options.envs = Object.keys(options.envs).filter(function cliEnv(key) {
			return options.envs[key];
		});
	}

	if (options.config != null) {
		// The "config" option has been deprecated. Use "configFile".
		options.configFile = options.config;
	}

	if (options.rulesdir != null) {
		// The "rulesdir" option has been deprecated. Use "rulePaths".
		if (typeof options.rulesdir === 'string') {
			options.rulePaths = [options.rulesdir];
		} else {
			options.rulePaths = options.rulesdir;
		}
	}

	if (options.eslintrc != null) {
		// The "eslintrc" option has been deprecated. Use "useEslintrc".
		options.useEslintrc = options.eslintrc;
	}

	return options;
};

/**
 * Resolve writable
 *
 * @param {Object} message - an eslint message
 * @returns {Boolean} whether the message is an error message
 */
exports.isErrorMessage = function(message) {
	var level = message.fatal ? 2 : message.severity;
	if (Array.isArray(level)) {
		level = level[0];
	}
	return (level > 1);
};

/**
 * Resolve formatter from unknown type (accepts string or function)
 *
 * @throws TypeError thrown if unable to resolve the formatter type
 * @param {(String|Function)} [formatter=stylish] - A name to resolve as a formatter. If a function is provided, the same function is returned.
 * @returns {Function} An eslint formatter
 */
exports.resolveFormatter = function(formatter) {
	// use eslint to look up formatter references
	if (typeof formatter !== 'function') {
		// load formatter (module, relative to cwd, eslint formatter)
		formatter =	(new CLIEngine()).getFormatter(formatter) || formatter;
	}

	if (typeof formatter !== 'function') {
		// formatter not found
		throw new TypeError('Invalid Formatter');
	}

	return formatter;
};

/**
 * Resolve writable
 *
 * @param {(Function|stream)} [writable=gulp-util.log] - A stream or function to resolve as a format writer
 * @returns {Function} A function that writes formatted messages
 */
exports.resolveWritable = function(writable) {
	if (!writable) {
		writable = gutil.log;
	} else if (typeof writable.write === 'function') {
		writable = writable.write.bind(writable);
	}
	return writable;
};

/**
 * Write formatter results to writable/output
 *
 * @param {Object[]} results - A list of eslint results
 * @param {Function} formatter - A function used to format eslint results
 * @param {Function} writable - A function used to write formatted eslint results
 */
exports.writeResults = function(results, formatter, writable) {
	var config;
	if (!results) {
		results = [];
	}
	// get the first result config
	results.some(function(result) {
		config = result && result.config;
		return config;
	});

	var message = formatter(results, config || {});
	if (writable && message != null && message !== '') {
		writable(message);
	}
};
