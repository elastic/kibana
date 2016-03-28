var _                     = require('lodash');
var Bluebird              = require('bluebird');
var exec                  = require('child_process').exec;
var semver                = require('semver');
var join                  = require('path').join;
var installSnapshotPlugin = require('./installSnapshotPlugin');
var getActualVersion      = require('./getActualVersion');
var getFeatures           = require('./featureDetection').getFeatures;

var ERR_UNKNOWN = 0;
var ERR_DOWNLOAD_FAILED = 1;
var ERR_ALREADY_EXISTS = 2;

function createLegacyPluginInstallCommand(path, plugin, features) {
  var cmd = join(path, 'bin', 'plugin');
  cmd += ' --install ';
  if (_.isPlainObject(plugin)) {
    cmd += plugin.name;
    if (plugin.path) cmd += ' --url ' + plugin.path;
    if (plugin.staging) cmd += ' ' + features.configVarFlag + 'features.es.plugins.staging=true';
  } else {
    cmd += plugin;
  }
  return cmd;
}

function create2xPluginInstallCommand(path, plugin, features) {
  var cmd = join(path, 'bin', 'plugin');
  cmd += ' install ';
  if (_.isPlainObject(plugin)) {
    cmd += (plugin.path) ? plugin.path : plugin.name;
    if (plugin.staging) cmd += ' ' + features.configVarFlag + 'plugins.staging=true';
  } else {
    cmd += plugin;
  }
  return cmd;
}

function create5xPluginInstallCommand(path, plugin, features) {
  var cmd = join(path, 'bin', 'elasticsearch-plugin');
  cmd += ' install ';
  if (_.isPlainObject(plugin)) {
    cmd += (plugin.path) ? plugin.path : plugin.name;
    if (plugin.staging) cmd += ' ' + features.configVarFlag + 'plugins.staging=true';
  } else {
    cmd += plugin;
  }
  return cmd;
}


function installCommand(path, plugin) {
  return Bluebird.all([
    getFeatures(path),
    getActualVersion(path),
  ])
  .spread(function (features, version) {

    if (semver.satisfies(version, '<=1.x')) {
      return createLegacyPluginInstallCommand(path, plugin, features);
    }

    if (semver.satisfies(version, '2.x')) {
      return create2xPluginInstallCommand(path, plugin, features);
    }

    if (semver.satisfies(version, '5.x || 3.x')) {
      return create5xPluginInstallCommand(path, plugin, features);
    }

    throw new Error('Not sure how to install plugins for version ' + version);
  });
}

function getErrorCause(stdout) {
  if (stdout.match(new RegExp('failed to download', 'i'))) return ERR_DOWNLOAD_FAILED;
  if (stdout.match(new RegExp('already exists', 'i'))) return ERR_ALREADY_EXISTS;
  return ERR_UNKNOWN;
}

/**
 * Install a plugin
 * @param {object} options Options object
 * @param {string} options.path The path of the install
 * @param {mixed} options.plugin The plugin uri or an object with name and path to binary.
 * @param {function} [options.log] The logger
 * @returns {Promise}
 */
module.exports = function installPlugin(options, cb) {
  var log = options.log || _.noop;
  var path = options.path;
  var plugin = options.plugin;
  var pluginName = (_.isPlainObject(plugin) ? plugin.name : plugin);

  if (_.isPlainObject(plugin) && plugin.snapshot) return installSnapshotPlugin(options, installPlugin, cb);

  function handleInstallError(resolve, reject, stdout, fn) {
    var errorCause = getErrorCause(stdout);
    if (errorCause === ERR_DOWNLOAD_FAILED) {
      var msg = 'Failed to download plugin: ' + pluginName + '\n' + stdout;
      return reject(new Error(msg));
    }
    if (errorCause === ERR_ALREADY_EXISTS) return resolve(true);

    fn.call(fn);
  }

  log('INFO', 'Installing "'+ pluginName + '" plugin');
  return installCommand(path, plugin).then(function (cmd) {
    return new Bluebird(function (resolve, reject) {
      exec(cmd, function (err, stdout) {
        if (!err) return resolve(stdout);
        handleInstallError(resolve, reject, stdout, function () {
          // TODO: should probably handle other errors
          resolve(true);
        });
      });
    })
  }).nodeify(cb);
};
