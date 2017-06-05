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

  const savedObjectsClientCache = new WeakMap();
  server.decorate('request', 'getSavedObjectsClient', function () {
    const request = this;

    if (savedObjectsClientCache.has(request)) {
      return savedObjectsClientCache.get(request);
    }

    const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
    const callAdminCluster = (...args) => callWithRequest(request, ...args);
    const savedObjectsClient = new SavedObjectsClient(
          server.config().get('kibana.index'),
          callAdminCluster
    );
    savedObjectsClientCache.set(request, savedObjectsClient);
    return savedObjectsClient;
  });
}
