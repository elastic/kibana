import _ from 'lodash';
import { optsFromKbnServer } from './opts_from_kbn_server';
import Migrations from '@kbn/migrations';

export async function migrateKibanaIndex(kbnServer) {
  const opts = optsFromKbnServer(kbnServer);
  const force = _.get(kbnServer, 'settings.migration.force');
  const { status } = await Migrations.migrate({ ...opts, force });

  if (status !== Migrations.MigrationStatus.migrated) {
    // eslint-disable-next-line max-len
    throw new Error(`The Kibana index is ${status}. If a previous migration failed, you can force migrations to run by starting Kibana with the --force-migration option.`);
  }
}
