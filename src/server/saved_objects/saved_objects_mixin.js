import { SavedObjectsClient } from './client';
import { Mapping, Document } from '@kbn/migrations';
import { optsFromKbnServer } from '../migrations';
import { once } from 'lodash';
import {
  createBulkGetRoute,
  createCreateRoute,
  createDeleteRoute,
  createFindRoute,
  createGetRoute,
  createUpdateRoute,
} from './routes';

// Computing isn't terribly expensive, but it's not 100% free,
// so, we may as well cache them.
const cachedMappings = once(Mapping.fromPlugins);

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

  server.decorate('server', 'savedObjectsClientFactory', ({ callCluster }) => {
    const opts = optsFromKbnServer(kbnServer, callCluster);

    return new SavedObjectsClient({
      callCluster,
      mappings: cachedMappings(opts.plugins),
      transformDocuments: ({ migrationState, docs }) => Document.transform({ ...opts, migrationState, docs }),
      index: server.config().get('kibana.index'),
    });
  });

  const savedObjectsClientCache = new WeakMap();
  server.decorate('request', 'getSavedObjectsClient', function () {
    const request = this;

    if (savedObjectsClientCache.has(request)) {
      return savedObjectsClientCache.get(request);
    }

    const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
    const callCluster = (...args) => callWithRequest(request, ...args);
    const savedObjectsClient = server.savedObjectsClientFactory({ callCluster });

    savedObjectsClientCache.set(request, savedObjectsClient);
    return savedObjectsClient;
  });
}
