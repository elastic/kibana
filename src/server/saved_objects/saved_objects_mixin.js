import { createSavedObjectsService } from './saved_objects_service';

import {
  createBulkGetRoute,
  createCreateRoute,
  createDeleteRoute,
  createFindRoute,
  createGetRoute,
  createUpdateRoute,
} from './routes';

export function savedObjectsMixin(kbnServer, server) {
  const prereqs = {
    getSavedObjectsClient: {
      assign: 'savedObjectsClient',
      method(req, reply) {
        reply(req.getSavedObjectsClient());
      },
    },
  };

  server.route(createBulkGetRoute(prereqs));
  server.route(createCreateRoute(prereqs));
  server.route(createDeleteRoute(prereqs));
  server.route(createFindRoute(prereqs));
  server.route(createGetRoute(prereqs));
  server.route(createUpdateRoute(prereqs));

  server.decorate('server', 'savedObjects', createSavedObjectsService(server));

  server.decorate('server', 'savedObjectsClientFactory', ({ request }) => {
    return server.savedObjects.getScopedSavedObjectsClient(request);
  });

  const savedObjectsClientCache = new WeakMap();
  server.decorate('request', 'getSavedObjectsClient', function () {
    const request = this;

    if (savedObjectsClientCache.has(request)) {
      return savedObjectsClientCache.get(request);
    }

    const savedObjectsClient = server.savedObjectsClientFactory({ request });

    savedObjectsClientCache.set(request, savedObjectsClient);
    return savedObjectsClient;
  });
}
