import _ from 'lodash';
import collectDashboards from './collect_dashboards';
import { SavedObjectsClient } from '../../../../../server/saved_objects';

export const deps = { collectDashboards };

export default function exportDashboards(req) {
  const ids = _.flatten([req.payload || req.query.dashboard]);
  const config = req.server.config();

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const callAdminCluster = (...args) => callWithRequest(req, ...args);
  const savedObjectsClient = new SavedObjectsClient(config.get('kibana.index'), callAdminCluster);

  return deps.collectDashboards(savedObjectsClient, ids).then(objects => {
    return {
      version: config.get('pkg.version'),
      objects
    };
  });
}
