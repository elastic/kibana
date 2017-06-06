import { flatten } from 'lodash';
import { SavedObjectsClient } from '../../../../../server/saved_objects';

export default function importDashboards(req) {
  const { payload } = req;
  const config = req.server.config();
  const force = 'force' in req.query && req.query.force !== false;
  const exclude = flatten([req.query.exclude]);

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const callAdminCluster = (...args) => callWithRequest(req, ...args);
  const savedObjectsClient = new SavedObjectsClient(config.get('kibana.index'), callAdminCluster);


  if (payload.version !== config.get('pkg.version')) {
    return Promise.reject(new Error(`Version ${payload.version} does not match ${config.get('pkg.version')}.`));
  }

  const objects = payload.objects
    .filter(item => !exclude.includes(item.type));

  return savedObjectsClient.bulkCreate(objects, { force })
    .then(objects => {
      return { objects };
    });
}
