import { getStats } from './stats';

export function statsMixin(kbnServer, server) {

  /**
   *  Get a summary about the number of objects in the kibana index
   *  @name server.getKibanaStats
   *  @param {Object} options
   *  @property {Function} options.callCluster method for calling the elasticsearch cluster
   */
  server.decorate('server', 'getKibanaStats', async ({ callCluster }) => {
    const savedObjectsClient = server.savedObjectsClientFactory({ callCluster });
    return await getStats(
      server.config().get('kibana.index'),
      savedObjectsClient
    );
  });

  server.route({
    method: 'GET',
    path: '/api/stats',
    handler: function (request, reply) {
      const stats = getStats(
        server.config().get('kibana.index'),
        request.getSavedObjectsClient()
      );

      return reply(stats);
    }
  });
}
