import { SavedObjectsClient, SavedObjectsRepository, SavedObjectsClientProvider } from './client';
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

  async function onBeforeWrite() {
    const adminCluster = server.plugins.elasticsearch.getCluster('admin');

    try {
      const index = server.config().get('kibana.index');
      await adminCluster.callWithInternalUser('indices.putTemplate', {
        name: `kibana_index_template:${index}`,
        body: {
          template: index,
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
          },
          mappings: server.getKibanaIndexMappingsDsl(),
        },
      });
    } catch (error) {
      server.log(['debug', 'savedObjects'], {
        tmpl: 'Attempt to write indexTemplate for SavedObjects index failed: <%= err.message %>',
        es: {
          resp: error.body,
          status: error.status,
        },
        err: {
          message: error.message,
          stack: error.stack,
        },
      });

      // We reject with `es.ServiceUnavailable` because writing an index
      // template is a very simple operation so if we get an error here
      // then something must be very broken
      throw new adminCluster.errors.ServiceUnavailable();
    }
  }

  const savedObjectsClientProvider = new SavedObjectsClientProvider({
    index: server.config().get('kibana.index'),
    mappings: server.getKibanaIndexMappingsDsl(),
    onBeforeWrite,
    SavedObjectsRepository,
    defaultClientFactory({
      SavedObjectsRepository,
      request,
      index,
      mappings,
      onBeforeWrite
    }) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const callCluster = (...args) => callWithRequest(request, ...args);

      const repository = new SavedObjectsRepository({
        index,
        mappings,
        onBeforeWrite,
        callCluster
      });

      return new SavedObjectsClient(repository);
    }
  });

  server.decorate('server', 'getSavedObjectsClientProvider', () => savedObjectsClientProvider);

  server.decorate('server', 'savedObjectsClientFactory', ({ request }) => {
    return savedObjectsClientProvider.createSavedObjectsClient(request);
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
