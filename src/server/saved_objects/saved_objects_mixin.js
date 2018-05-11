import { SavedObjectsClient } from './client';
import { Mapping, Document, Migration, MigrationStatus } from '@kbn/migrations';
import Boom from 'boom';
import _ from 'lodash';
import {
  createBulkGetRoute,
  createCreateRoute,
  createDeleteRoute,
  createFindRoute,
  createGetRoute,
  createUpdateRoute,
} from './routes';

// Computing isn't terribly expensive, but it's not 100% free,
// so, we may as well cache the mappings and the computed opts,
// as they don't change over the course of the application's life.
// We can't compute them directly in `savedObjectsMixin` because
// they rely on plugins that don't exist at the time the mixin is created.
const cachedMappings = _.once(Mapping.fromPlugins);
const cachedOpts = _.once((server) => server.plugins.kibanamigrations.migrationOptions({ callCluster: _.noop }));

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
    const index = server.config().get('kibana.index');
    const opts = { ...cachedOpts(server), callCluster };

    return new SavedObjectsClient({
      callCluster,
      index,
      onBeforeWrite: () => assertIndexMigrated(opts),
      mappings: cachedMappings(opts),
      transformDocuments: ({ migrationState, docs }) => Document.transform({ ...opts, migrationState, docs }),
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

// This is a relatively inexpensive check to ensure that the index hasn't been
// tampered with (too much). If the index has been deleted or if the migration state
// document has been deleted, this will bomb. This does not detect a lot of other
// forms of tampering (mapping changes, migration state document tampering, etc).
async function assertIndexMigrated(opts) {
  const status = await Migration.computeStatus(opts);
  if (status !== MigrationStatus.migrated) {
    throw Boom.notFound(`
      Index ${opts.index} has not been migrated or may have been deleted.
      Restarting Kibana may fix the problem.
    `);
  }
}
