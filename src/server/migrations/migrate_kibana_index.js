import _ from 'lodash';
import { optsFromKbnServer } from './opts_from_kbn_server';
import { MigrationStatus, Migration } from '@kbn/migrations';

export async function migrateKibanaIndex(kbnServer) {
  const opts = optsFromKbnServer(kbnServer);
  const force = _.get(kbnServer, 'settings.migration.force');
  const { status } = await Migration.migrate({ ...opts, force });

  if (status !== MigrationStatus.migrated) {
    kbnServer.server.log(
      ['fatal', 'migration'],
      `The Kibana index is ${status}. Most likely an other instance of Kibana is currently migrating the index. ` +
        'If a previous migration failed, you can reattempt the migration by starting Kibana with the --force-migration option.'
    );

    throw new Error(`Failed to start because the Kibana index is ${status}.`);
  }
}
