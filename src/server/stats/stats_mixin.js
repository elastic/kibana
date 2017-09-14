import { getStats } from './stats';

export function statsMixin(kbnServer, server) {

  /**
   *  Get a summary about the number of objects in the kibana index
   *  @name server.getKibanaStats
   *  @param {Object} options
   *  @property {Function} options.callCluster method for calling the elasticsearch cluster
   *
   *  NOTE: this API will be moved out to an external plugin in 6.1, and likely
   *  have breaking changes in the format of the response data
   */
  server.decorate('server', 'getKibanaStats', async ({ callCluster }) => {
    const savedObjectsClient = server.savedObjectsClientFactory({ callCluster });
    return await getStats(
      server.config().get('kibana.index'),
      savedObjectsClient
    );
  });
}
