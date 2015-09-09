let _ = require('lodash');
var utils = require('requirefrom')('src/utils');
var fromRoot = utils('fromRoot');
var pluginDownloader = require('./pluginDownloader');
var pluginCleaner = require('./pluginCleaner');
var KbnServer = require('../../server/KbnServer');
var readYamlConfig = require('../serve/readYamlConfig');
var fs = require('fs');

module.exports = {
  install: install
};

function install(settings, logger) {
  logger.log(`Installing ${settings.package}`);

  try {
    fs.statSync(settings.pluginPath);

    logger.error(`Plugin ${settings.package} already exists, please remove before installing a new version`);
    process.exit(70); // eslint-disable-line no-process-exit
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  var cleaner = pluginCleaner(settings, logger);
  var downloader = pluginDownloader(settings, logger);

  return cleaner.cleanPrevious()
  .then(function () {
    return downloader.download();
  })
  .then(async function() {
    logger.log('Optimizing and caching browser bundles...');
    let serverConfig = readYamlConfig(settings.config);
    _.set(serverConfig, 'logging.silent', settings.silent);
    _.set(serverConfig, 'logging.quiet', !settings.silent);
    _.set(serverConfig, 'logging.verbose', false);
    _.set(serverConfig, 'optimize.useBundleCache', false);
    _.set(serverConfig, 'server.autoListen', false);
    _.set(serverConfig, 'plugins.initialize', false);
    _.set(serverConfig, 'env', 'production');
    _.set(serverConfig, 'plugins.scanDirs', [settings.pluginDir, fromRoot('src/plugins')]);
    _.set(serverConfig, 'plugins.paths', [settings.workingPath]);

    let kbnServer = new KbnServer(serverConfig);
    await kbnServer.ready();
    await kbnServer.close();
  })
  .then(function () {
    fs.renameSync(settings.workingPath, settings.pluginPath);
    logger.log('Plugin installation complete');
  })
  .catch(function (e) {
    logger.error(`Plugin installation was unsuccessful due to error "${e.message}"`);
    cleaner.cleanError();
    process.exit(70); // eslint-disable-line no-process-exit
  });
}
