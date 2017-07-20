import { IndicesService } from './service';
import { searchIndicesRoute } from './routes';

export function indicesMixin(kbnServer, server) {
  const pre = {
    /**
    *  Create an instance of the `indices` service against the data cluster
    *  @type {Hapi.Pre}
    */
    getIndicesDataService: {
      assign: 'dataIndices',
      method(req, reply) {
        const dataCluster = req.server.plugins.elasticsearch.getCluster('data');
        const callDataCluster = (...args) => (
          dataCluster.callWithRequest(req, ...args)
        );

        reply(new IndicesService(callDataCluster));
      }
    },
    /**
    *  Create an instance of the `indices` service against the admin cluster
    *  @type {Hapi.Pre}
    */
    getIndicesAdminService: {
      assign: 'adminIndices',
      method(req, reply) {
        const dataCluster = req.server.plugins.elasticsearch.getCluster('admin');
        const callDataCluster = (...args) => (
          dataCluster.callWithRequest(req, ...args)
        );

        reply(new IndicesService(callDataCluster));
      }
    }
  };

  server.route(searchIndicesRoute(pre));
}
