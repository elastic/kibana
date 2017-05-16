import { SavedObjectsClient } from './client';

import {
  createCreateRoute,
  createDeleteRoute,
  createFindRoute,
  createReadRoute,
  createUpdateRoute
} from './routes';

export function savedObjectsMixin(kbnServer, server) {
  const prereqs = {
    getSavedObjectsClient: {
      assign: 'savedObjectsClient',
      method(req, reply) {
        const adminCluster = req.server.plugins.elasticsearch.getCluster('admin');
        const callAdminCluster = (...args) => adminCluster.callWithRequest(req, ...args);

        reply(new SavedObjectsClient(
          server.config().get('kibana.index'),
          callAdminCluster
        ));
      }
    },
  };

  server.route(createCreateRoute(prereqs));
  server.route(createDeleteRoute(prereqs));
  server.route(createFindRoute(prereqs));
  server.route(createReadRoute(prereqs));
  server.route(createUpdateRoute(prereqs));
}
