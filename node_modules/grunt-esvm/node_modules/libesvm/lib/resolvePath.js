var resolveVersionPath = require('./resolveVersionPath');
var resolveBranchPath  = require('./resolveBranchPath');
var resolveBinaryPath  = require('./resolveBinaryPath');

/**
 * Resolves the path based on the type of install
 * @param {object} options The options object
 * @param {string} options.directory The install directory
 * @param {string} options.version The semver (overrides branch and path)
 * @param {string} options.branch The Github branch (overrides path)
 * @param {string} options.binary The file or url path to tarball
 * @returns {Promise}
 */
module.exports = function (options) {
	if (options.version) {
		return resolveVersionPath(options.directory, options.version);
	}
	else if (options.branch) {
		return resolveBranchPath(options.directory, options.branch);
	}
	else if (options.binary) {
		return resolveBinaryPath(options.directory, options.binary);
	} else {
    throw new Error('Unable to determine install method.');
	}
};

