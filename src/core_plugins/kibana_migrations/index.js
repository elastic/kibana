import _ from 'lodash';
import { MigrationStatus, Migration } from '@kbn/migrations';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        pollInterval: Joi.number().default(1000),
      }).default();
    },

    init(server) {
      server.expose('migrationOptions', ({ callCluster } = {}) => optsFromKbnServer(this.kbnServer, callCluster));

      this.status.yellow('Waiting for elasticsearch...');
      return server.plugins.elasticsearch.waitUntilReady()
        .then(() => this.status.yellow('Migrating the Kibana index...'))
        .then(() => migrateKibanaIndex(this.kbnServer))
        .then(() => this.status.green('Ready'));
    }
  });
}

export function pluginSpecsToMigrations(pluginSpecs) {
  return pluginSpecs
    .map((spec) => ({
      id: spec.getId(),
      mappings: _.get(spec.getExportSpecs(), 'mappings'),
      migrations: spec.getMigrations(),
    }))
    .filter(p => p.migrations || p.mappings);
}

async function migrateKibanaIndex(kbnServer) {
  const opts = optsFromKbnServer(kbnServer);
  const force = _.get(kbnServer, 'settings.migration.force');
  const { status } = await Migration.migrate({ ...opts, force });

  if (status !== MigrationStatus.migrated) {
    kbnServer.server.log(
      ['warning', 'migration'],
      `The Kibana index is ${status}. Most likely an other instance of Kibana is currently migrating the index. ` +
        'If a previous migration failed, you can reattempt the migration by starting Kibana with the --force-migration option.'
    );
    await waitForMigration(opts, kbnServer.server.config().get('kibanamigrations.pollInterval'));
  }
}

async function waitForMigration(opts, pollInterval) {
  let status = MigrationStatus.migrating;
  while (status !== MigrationStatus.migrated) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    status = await Migration.computeStatus(opts);
  }
}

function optsFromKbnServer({ pluginSpecs, server, version }, callCluster) {
  return {
    elasticVersion: version,
    index: server.config().get('kibana.index'),
    log: (...args) => server.log(...args),
    callCluster: callCluster || server.plugins.elasticsearch.getCluster('admin').callWithInternalUser,
    plugins: pluginSpecsToMigrations(pluginSpecs),
  };
}
