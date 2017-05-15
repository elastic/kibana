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
      method(request, reply) {
        reply(new SavedObjectsClient(
          server.config().get('kibana.index'),
          request,
          server.plugins.elasticsearch.getCluster('admin').callWithRequest
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
