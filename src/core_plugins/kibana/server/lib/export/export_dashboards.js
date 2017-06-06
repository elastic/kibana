import _ from 'lodash';
import { collectDashboards } from './collect_dashboards';
import { SavedObjectsClient } from '../../../../../server/saved_objects';


export async function exportDashboards(req) {
  const ids = _.flatten([req.query.dashboard]);
  const config = req.server.config();

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const callAdminCluster = (...args) => callWithRequest(req, ...args);
  const savedObjectsClient = new SavedObjectsClient(config.get('kibana.index'), callAdminCluster);

  const objects = await collectDashboards(savedObjectsClient, ids);
  return {
    version: config.get('pkg.version'),
    objects
  };

}
