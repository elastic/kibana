'use strict';
var globule = require('globule');
var findup = require('findup-sync');
var path = require('path');

function arrayify(el) {
	return Array.isArray(el) ? el : [el];
}

module.exports = function (grunt, options) {
	options = options || {};

	var pattern = arrayify(options.pattern || ['grunt-*']);
	var config = options.config || findup('package.json');
	var scope = arrayify(options.scope || ['dependencies', 'devDependencies', 'peerDependencies']);

	if (typeof config === 'string') {
		config = require(path.resolve(config));
	}

	pattern.push('!grunt', '!grunt-cli');

	var names = scope.reduce(function (result, prop) {
		return result.concat(Object.keys(config[prop] || {}));
	}, []);

	globule.match(pattern, names).forEach(grunt.loadNpmTasks);
};
