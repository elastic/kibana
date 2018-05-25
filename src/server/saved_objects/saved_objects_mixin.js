import { createSavedObjectsService } from './service';

import {
  createBulkGetRoute,
  createCreateRoute,
  createDeleteRoute,
  createFindRoute,
  createGetRoute,
  createUpdateRoute,
} from './routes';

export function savedObjectsMixin(kbnServer, server) {
  // we use kibana.index which is technically defined in the kibana plugin, so if
  // we don't have the plugin (mainly tests) we can't initialize the saved objects
  if (!kbnServer.pluginSpecs.find(p => p.getId() === 'kibana')) {
    return;
  }

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
