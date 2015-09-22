let _ = require('lodash');
let utils = require('requirefrom')('src/utils');
let fromRoot = utils('fromRoot');
let pluginDownloader = require('./pluginDownloader');
let pluginCleaner = require('./pluginCleaner');
let pluginExtractor = require('./pluginExtractor');
let KbnServer = require('../../server/KbnServer');
let readYamlConfig = require('../serve/readYamlConfig');
let fs = require('fs');
let Promise = require('bluebird');
let rimraf = require('rimraf');
let mkdirp = Promise.promisify(require('mkdirp'));

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

  let cleaner = pluginCleaner(settings, logger);
  let downloader = pluginDownloader(settings, logger);

  return cleaner.cleanPrevious()
  .then(() => {
    return mkdirp(settings.workingPath);
  })
  .then(() => {
    return downloader.download();
  })
  .then((archiveType) => {
    return pluginExtractor (settings, logger, archiveType);
  })
  .then(async function() {
    logger.log('Optimizing and caching browser bundles...');
    let serverConfig = _.merge(
      readYamlConfig(settings.config),
      {
        env: 'production',
        logging: {
          silent: settings.silent,
          quiet: !settings.silent,
          verbose: false
        },
        optimize: {
          useBundleCache: false
        },
        server: {
          autoListen: false
        },
        plugins: {
          initialize: false,
          scanDirs: [settings.pluginDir, fromRoot('src/plugins')],
          paths: [settings.workingPath]
        }
      }
    );

    let kbnServer = new KbnServer(serverConfig);
    await kbnServer.ready();
    await kbnServer.close();
  })
  .then(() => {
    rimraf.sync(settings.tempArchiveFile);
  })
  .then(() => {
    fs.renameSync(settings.workingPath, settings.pluginPath);
    logger.log('Plugin installation complete');
  })
  .catch((err) => {
    logger.error(`Plugin installation was unsuccessful due to error "${err.message}"`);
    cleaner.cleanError();
    process.exit(70); // eslint-disable-line no-process-exit
  });
}
