import _ from 'lodash';
import { collectDashboards } from './collect_dashboards';


export async function exportDashboards(req) {
  const ids = _.flatten([req.query.dashboard]);
  const config = req.server.config();

  const savedObjectsClient = req.getSavedObjectsClient();

  const objects = await collectDashboards(savedObjectsClient, ids);
  return {
    version: config.get('pkg.version'),
    objects
  };

}
