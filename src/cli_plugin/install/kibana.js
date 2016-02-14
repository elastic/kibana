import _ from 'lodash';
import fromRoot from '../../utils/fromRoot';
import KbnServer from '../../server/KbnServer';
import readYamlConfig from '../../cli/serve/read_yaml_config';
import { statSync, renameSync } from 'fs';

export function existingInstall(settings, logger) {
  try {
    statSync(settings.pluginPath);

    logger.error(`Plugin ${settings.plugin} already exists, please remove before installing a new version`);
    process.exit(70); // eslint-disable-line no-process-exit
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

export async function rebuildCache(settings, logger) {
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

export function checkVersion(settings) {
  let pkg;
  try {
    pkg = require(settings.tempPackageFile);
  } catch (error) {
    throw 'Valid package.json file not found in archive.';
  }

  if (!pkg.version) {
    throw new Error (`Plugin version not found. Check package.json in archive`);
  }

  if (pkg.version !== settings.version) {
    throw new Error (`Incorrect version in plugin. Expected [${settings.version}]; found [${pkg.version}]`);
  }
}
