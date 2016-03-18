import _ from 'lodash';
import fromRoot from '../../utils/from_root';
import KbnServer from '../../server/kbn_server';
import readYamlConfig from '../../cli/serve/read_yaml_config';
import versionSatisfies from '../../utils/version_satisfies';
import { statSync } from 'fs';

export function existingInstall(settings, logger) {
  try {
    statSync(settings.plugins[0].path);

    logger.error(`Plugin ${settings.plugins[0].name} already exists, please remove before installing a new version`);
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

export function assertVersion(settings) {
  if (!settings.plugins[0].version) {
    throw new Error (`Plugin version not found. Check package.json in archive`);
  }

  if (!versionSatisfies(settings.plugins[0].version, settings.version)) {
    throw new Error (`Incorrect version in plugin [${settings.plugins[0].name}]. ` +
      `Expected [${settings.version}]; found [${settings.plugins[0].version}]`);
  }
}
