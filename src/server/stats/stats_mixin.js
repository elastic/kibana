import { getStats } from './stats';

export function statsMixin(kbnServer, server) {
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
