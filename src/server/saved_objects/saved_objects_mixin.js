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
        reply(req.getSavedObjectsClient());
      }
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
      await adminCluster.callWithInternalUser('cluster.health', {
        timeout: `${server.config().get('savedObjects.indexCheckTimeout')}ms`,
        index: server.config().get('kibana.index'),
        waitForStatus: 'yellow',
      });
    } catch (error) {
      // This check is designed to emulate our planned index template move until
      // we get there, and once we do the plan is to just post the index template
      // and attempt the request.
      //
      // Because of this we only throw NotFound() when the status is red AND
      // there are no shards. All other red statuses indicate real problems that
      // will be described in better detail when the write fails.
      if (
        error &&
        error.body &&
        error.body.status === 'red' &&
        !error.body.unassigned_shards &&
        !error.body.initializing_shards &&
        !error.body.delayed_unassigned_shards
      ) {
        server.log(['debug', 'savedObjects'], `Attempted to write to the Kibana index when it didn't exist.`);
        throw new adminCluster.errors.NotFound();
      }
    }
  }

  server.decorate('server', 'savedObjectsClientFactory', ({ callCluster }) => {
    return new SavedObjectsClient({
      index: server.config().get('kibana.index'),
      mappings: server.getKibanaIndexMappingsDsl(),
      callCluster,
      onBeforeWrite,
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
