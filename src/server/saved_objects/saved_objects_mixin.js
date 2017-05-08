import { SavedObjectsClient } from './client';

import {
  createDeleteRoute,
  createFindRoute,
  createGetIdsRoute,
  createGetRoute,
  createMgetRoute,
  createSaveRoute,
  createScanStartRoute,
  createScanNextPageRoute,
  createGetTypesRoute,
  createDefineTypeRoute,
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

  server.route(createDeleteRoute(prereqs));
  server.route(createFindRoute(prereqs));
  server.route(createGetIdsRoute(prereqs));
  server.route(createGetRoute(prereqs));
  server.route(createMgetRoute(prereqs));
  server.route(createSaveRoute(prereqs));
  server.route(createScanStartRoute(prereqs));
  server.route(createScanNextPageRoute(prereqs));
  server.route(createGetTypesRoute(prereqs));
  server.route(createDefineTypeRoute(prereqs));
}
