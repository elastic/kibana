import { SavedObjectsClient } from './client';

import {
  createBulkGetRoute,
  createCreateRoute,
  createDeleteRoute,
  createFindRoute,
  createGetRoute,
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

  server.route(createBulkGetRoute(prereqs));
  server.route(createCreateRoute(prereqs));
  server.route(createDeleteRoute(prereqs));
  server.route(createFindRoute(prereqs));
  server.route(createGetRoute(prereqs));
  server.route(createUpdateRoute(prereqs));
}
