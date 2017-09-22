import { Subject } from 'rxjs/Rx';
import Boom from 'boom';

import { SavedObjectsClient } from './client';
import { createIsEsUsable$ } from './mappings';

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

  // stream that we write to whenever we think
  // isEsUsable$ should double check for es availability
  const testEsAvailability$ = new Subject();

  // stream that emits undefined when es status is being checked,
  // true when es is considered to be usable, and false when it is
  // considered unusable
  const isEsUsable$ = createIsEsUsable$({
    test$: testEsAvailability$,
    config: kbnServer.config,
    pluginExports: server.plugins,
    savedObjectMappings: kbnServer.savedObjectMappings,
  });

  server.decorate('server', 'savedObjectsClientFactory', ({ callCluster }) => {
    return new SavedObjectsClient(
      server.config().get('kibana.index'),
      kbnServer.savedObjectMappings.getDsl(),
      async (method, params) => {
        const esIsUsable = await isEsUsable$
          .filter(esIsUsable => esIsUsable != null)
          .first()
          .toPromise();

        if (!esIsUsable) {
          testEsAvailability$.next();
          throw Boom.serverUnavailable('Elasticsearch is unavailable');
        }

        try {
          return await callCluster(method, params);
        } catch (error) {
          if (!error || !error.status || error.status >= 500) {
            testEsAvailability$.next();
          }

          throw error;
        }
      }
    );
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

  kbnServer.ready().then(() => {
    // when the kbnServer is ready plugins have loaded, so if
    // elasticsearch is enabled it will be available on the server now
    testEsAvailability$.next();
  });

  server.ext('onPreStop', (server, next) => {
    // listen to isEsUsable$ and when it completes allow the server to stop
    isEsUsable$.toPromise().then(() => next());

    // complete the input stream to signal that isEsUsable$ should stop
    testEsAvailability$.complete();
  });
}
