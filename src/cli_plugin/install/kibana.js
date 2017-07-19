import _ from 'lodash';
import path from 'path';
import { fromRoot } from '../../utils';
import KbnServer from '../../server/kbn_server';
import readYamlConfig from '../../cli/serve/read_yaml_config';
import { versionSatisfies, cleanVersion } from '../../utils/version';
import { statSync } from 'fs';

export function existingInstall(settings, logger) {
  try {
    statSync(path.join(settings.pluginDir, settings.plugins[0].name));

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
        scanDirs: [settings.pluginDir, fromRoot('src/core_plugins')]
      },
      uiSettings: {
        enabled: false
      }
    }
  );

  const kbnServer = new KbnServer(serverConfig);
  await kbnServer.ready();
  await kbnServer.close();
}

export function assertVersion(settings) {
  if (!settings.plugins[0].kibanaVersion) {
    throw new Error (`Plugin package.json is missing both a version property (required) and a kibana.version property (optional).`);
  }

  const actual = cleanVersion(settings.plugins[0].kibanaVersion);
  const expected = cleanVersion(settings.version);
  if (!versionSatisfies(actual, expected)) {
    throw new Error (`Incorrect Kibana version in plugin [${settings.plugins[0].name}]. ` +
      `Expected [${expected}]; found [${actual}]`);
  }
}
