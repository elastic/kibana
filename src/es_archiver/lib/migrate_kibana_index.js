import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { Migration } from '@kbn/migrations';
import { findPluginSpecs } from '../../plugin_discovery';

// This is an expensive operation, so we'll ensure it only happens once
const buildPlugins = _.once(async () => {
  const pluginSpecs = await findPluginSpecs({
    plugins: {
      scanDirs: [path.resolve(__dirname, '../../core_plugins')],
      paths: [path.resolve(__dirname, '../../../x-pack')],
    },
  });
  return pluginSpecsToMigrations(await pluginSpecs.spec$.toArray().toPromise());
});

export async function migrateKibanaIndex({ client, log }) {
  const opts = {
    index: '.kibana',
    elasticVersion: await loadElasticVersion(),
    plugins: await buildPlugins(),
    callCluster: (path, ...args) => _.get(client, path).call(client, ...args),
    log: ([logType, messageType], ...args) => log[logType](`[${messageType}] ${args.join(' ')}`),
  };

  return await Migration.migrate(opts);
}

function pluginSpecsToMigrations(pluginSpecs) {
  return pluginSpecs
    .map((spec) => ({
      id: spec.getId(),
      mappings: _.get(spec.getExportSpecs(), 'mappings'),
      migrations: spec.getMigrations(),
    }))
    .filter(p => p.migrations || p.mappings);
}

async function loadElasticVersion() {
  const readFile = promisify(fs.readFile);
  const packageJson = await readFile(path.join(__dirname, '../../../package.json'));
  return JSON.parse(packageJson).version;
}
