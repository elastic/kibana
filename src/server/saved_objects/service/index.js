import { SavedObjectsClient, SavedObjectsRepository } from '../client';
import { ScopedSavedObjectsClientProvider } from './scoped_saved_objects_client_provider';

export function createSavedObjectsService(server) {
  const onBeforeWrite = async () => {
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
        tmpl:
          'Attempt to write indexTemplate for SavedObjects index failed: <%= err.message %>',
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
  };

  const scopedClientProvider = new ScopedSavedObjectsClientProvider({
    index: server.config().get('kibana.index'),
    mappings: server.getKibanaIndexMappingsDsl(),
    onBeforeWrite,
    defaultClientFactory({
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

  return {
    SavedObjectsClient,
    SavedObjectsRepository,
    getScopedSavedObjectsClient: scopedClientProvider.getScopedSavedObjectsClient.bind(scopedClientProvider),
    registerScopedSavedObjectsClientFactory: scopedClientProvider.registerScopedSavedObjectsClientFactory.bind(scopedClientProvider),
  };
}
