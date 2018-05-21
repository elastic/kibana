import _ from 'lodash';
import { collectDashboards } from './collect_dashboards';

export async function exportDashboards(req) {
  const ids = _.flatten([req.query.dashboard]);
  const config = req.server.config();

  const savedObjectsClient = req.getSavedObjectsClient();
  const objects = await collectDashboards(savedObjectsClient, ids);
  const migrationState = await savedObjectsClient.get('migration', 'migration-state');

  return {
    version: config.get('pkg.version'),
    migrationState: migrationState.attributes,
    objects
  };
}
