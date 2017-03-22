import _ from 'lodash';
import { fromRoot } from '../../utils';
import KbnServer from '../../server/kbn_server';
import readYamlConfig from '../../cli/serve/read_yaml_config';
import { versionSatisfies } from '../../utils/version';
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

  const expectedRange = settings.plugins[0].kibanaVersion;
  const actualVersion = settings.version;
  if (!versionSatisfies(actualVersion, expectedRange)) {
    throw new Error (`Plugin [${settings.plugins[0].name}] requires Kibana version to be in range: ` +
      `[${expectedRange}], but found [${actualVersion}]`);
  }
}
