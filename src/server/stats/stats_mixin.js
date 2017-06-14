import { getStats } from './stats';

export function statsMixin(kbnServer, server) {
  server.route({
    method: 'GET',
    path: '/api/stats',
    handler: function (request, reply) {
      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
      const callAdminCluster = (...args) => callWithInternalUser(...args);

      const stats = getStats(
        server.config().get('kibana.index'),
        callAdminCluster
      );

      return reply(stats);
    }
  });
}
