var _                   = require('lodash');
var installVersion      = require('./installVersion');
var installFromBranch   = require('./installFromBranch');
var installFromBinary   = require('./installFromBinary');
var freshInstall        = require('./freshInstall');
var makeParentDirectory = require('./makeParentDirectory');
var resolvePath         = require('./resolvePath');
var Promises            = require('bluebird');
var fs                  = require('fs');
var statAsync           = Promises.promisify(fs.stat);


/**
 * Installs Elasticsearch
 * @param {object} options The options object
 * @param {string} options.directory The install directory
 * @param {string} options.version The semver (overrides branch and path)
 * @param {string} options.branch The Github branch (overrides path)
 * @param {string} options.path The file or url path to tarball
 * @param {boolean} [options.fresh] Perform a fresh install
 * @param {function} [log] The logger
 * @returns {Promise}
 */
module.exports = function (options, cb) {
  var directory = options.directory;
  var version   = options.version;
  var branch    = options.branch;
  var binary    = options.binary;
  var fresh     = options.fresh;
  var log       = options.log || _.noop;

  var install;


  if (version) {
    install = function (dest) {
      return installVersion({ directory: directory, dest: dest, version: version, log: log }, cb);
    };
  }
  else if (branch) {
    install = function (dest) {
      return installFromBranch({ directory: directory, dest: dest, branch: branch, log: log }, cb);
    };
  }
  else if (binary) {
    install = function (dest) {
      return installFromBinary({ directory: directory, dest: dest, binary: binary, log: log }, cb);
    };
  } else {
    throw new Error('Unable to determine install method.');
  }

  return resolvePath(options)
    .then(_.partial(freshInstall, fresh))
    .then(makeParentDirectory)
    .then(function (dest) {
      return statAsync(dest).catch(function (err) {
        if (err.cause && err.cause.code === 'ENOENT') return install(dest);
        throw err;
      });
    });
};
