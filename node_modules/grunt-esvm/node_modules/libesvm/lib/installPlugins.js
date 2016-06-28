var _ = require('lodash');
var Promises = require('bluebird');
var installPlugin = require('./installPlugin');

/**
 * Install plugins in a array
 * @param {object} options Options object
 * @param {array} options.plugins The list of plugins. Can be a string or an object with a name and path
 * @param {string} options.path The path to the install
 * @param {function} [options.log] The logger
 * @returns {type} description
 */
module.exports = function (options, cb) {
	var log = options.log || _.noop;
  log('INFO', 'Installing plugins');
	return Promises.resolve(options.plugins || []).each(function (plugin) {
		return installPlugin({ version: options.version, log: log, path: options.path, plugin: plugin });
	}).nodeify(cb);
};

