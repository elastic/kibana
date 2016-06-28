'use strict';

/* @flow */
/* eslint no-console:0 */
// Editions Loader

// Cache of which syntax combinations are supported or unsupported, hash of booleans
var syntaxFailures = {};

/**
 * Cycle through the editions for a package and require the correct one
 * @param {string} cwd - the path of the package, used to load package.json:editions and handle relative edition entry points
 * @param {function} _require - the require method of the calling module, used to ensure require paths remain correct
 * @param {string} [customEntry] - an optional override for the entry of an edition, requires the edition to specify a `directory` property
 * @returns {void}
 */
module.exports.requirePackage = function requirePackage(cwd /* :string */, _require /* :function */, customEntry /* :: ?:string */) /* : void */{
	// Fetch the result of the debug value
	// It is here to allow the environment to change it at runtime as needed
	var debug = process && process.env && process.env.DEBUG_BEVRY_EDITIONS;
	// const blacklist = process && process.env && process.env.DEBUG_BEVRY_IGNORE_BLACKLIST

	// Load the package.json file to fetch `name` for debugging and `editions` for loading
	var pathUtil = require('path');
	var packagePath = pathUtil.join(cwd, 'package.json');

	var _require2 = require(packagePath);

	var name = _require2.name;
	var editions = _require2.editions;
	// name:string, editions:array

	if (!editions || editions.length === 0) {
		throw new Error('No editions have been specified for the package ' + name);
	}

	// Note the last error message
	var lastEditionFailure = void 0;

	// Cycle through the editions
	for (var i = 0; i < editions.length; ++i) {
		// Extract relevant parts out of the edition
		// and generate a lower case, sorted, and joined combination of our syntax for caching
		var _editions$i = editions[i];
		var syntaxes = _editions$i.syntaxes;
		var entry = _editions$i.entry;
		var directory = _editions$i.directory;
		// syntaxes:?array, entry:?string, directory:?string

		// Checks

		if (customEntry && !directory) {
			throw new Error('The package ' + name + ' has no directory property on its editions which is required when using custom entry point: ' + customEntry);
		} else if (!entry) {
			throw new Error('The package ' + name + ' has no entry property on its editions which is required when using default entry');
		}

		// Get the correct entry path
		var entryPath = customEntry ? pathUtil.resolve(cwd, directory, customEntry) : pathUtil.resolve(cwd, entry);

		// Convert syntaxes into a sorted lowercase string
		var s = syntaxes && syntaxes.map(function (i) {
			return i.toLowerCase();
		}).sort().join(', ');

		// Is this syntax combination unsupported? If so skip it
		if (s && syntaxFailures[s]) {
			lastEditionFailure = new Error('Skipped package ' + name + ' edition at ' + entryPath + ' due to blacklisted syntax:\n' + s + '\n' + syntaxFailures[s].stack);
			if (debug) console.error('DEBUG: ' + lastEditionFailure.stack);
			continue;
		}

		// Try and load this syntax combination
		try {
			return _require(entryPath);
		} catch (error) {
			// Note the error with more details
			lastEditionFailure = new Error('Unable to load package ' + name + ' edition at ' + entryPath + ' with syntax:\n' + (s || 'no syntaxes specified') + '\n' + error.stack);
			if (debug) console.error('DEBUG: ' + lastEditionFailure.stack);

			// Blacklist the combination, even if it may have worked before
			// Perhaps in the future note if that if it did work previously, then we should instruct module owners to be more specific with their syntaxes
			if (s) syntaxFailures[s] = lastEditionFailure;
		}
	}

	// No edition was returned, so there is no suitable edition
	throw new Error('The package ' + name + ' has no suitable edition for this environment' + (lastEditionFailure && ', the last edition failed with:\n' + lastEditionFailure.stack || ''));
};