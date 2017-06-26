import { getStats } from './stats';

export function statsMixin(kbnServer, server) {
  server.route({
    method: 'GET',
    path: '/api/stats',
    handler: function (request, reply) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const callAdminCluster = (...args) => callWithRequest(request, ...args);

      const stats = getStats(
        server.config().get('kibana.index'),
        callAdminCluster
      );

      return reply(stats);
    }
  });
}
