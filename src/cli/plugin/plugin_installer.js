import _ from 'lodash';
const utils = require('requirefrom')('src/utils');
const fromRoot = utils('fromRoot');
import pluginDownloader from './plugin_downloader';
import pluginCleaner from './plugin_cleaner';
import pluginExtractor from './plugin_extractor';
import KbnServer from '../../server/KbnServer';
import readYamlConfig from '../serve/read_yaml_config';
import Promise from 'bluebird';
import { sync as rimrafSync } from 'rimraf';
import { statSync, renameSync } from 'fs';
const mkdirp = Promise.promisify(require('mkdirp'));

export default {
  install: install
};

function checkForExistingInstall(settings, logger) {
  try {
    statSync(settings.pluginPath);

    logger.error(`Plugin ${settings.package} already exists, please remove before installing a new version`);
    process.exit(70); // eslint-disable-line no-process-exit
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

async function rebuildKibanaCache(settings, logger) {
  logger.log('Optimizing and caching browser bundles...');
  const serverConfig = _.merge(
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
        scanDirs: [settings.pluginDir, fromRoot('src/plugins')]
      }
    }
  );

  const kbnServer = new KbnServer(serverConfig);
  await kbnServer.ready();
  await kbnServer.close();
}

async function install(settings, logger) {
  logger.log(`Installing ${settings.package}`);

  const cleaner = pluginCleaner(settings, logger);

  try {
    checkForExistingInstall(settings, logger);

    await cleaner.cleanPrevious();

    await mkdirp(settings.workingPath);

    const downloader = pluginDownloader(settings, logger);
    const { archiveType } = await downloader.download();

    await pluginExtractor (settings, logger, archiveType);

    rimrafSync(settings.tempArchiveFile);

    renameSync(settings.workingPath, settings.pluginPath);

    await rebuildKibanaCache(settings, logger);

    logger.log('Plugin installation complete');
  } catch (err) {
    logger.error(`Plugin installation was unsuccessful due to error "${err.message}"`);
    cleaner.cleanError();
    process.exit(70); // eslint-disable-line no-process-exit
  }
}
