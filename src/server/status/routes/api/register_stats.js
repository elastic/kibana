import Joi from 'joi';
import { wrapAuthConfig } from '../../wrap_auth_config';

/*
 * API for Kibana meta info and accumulated operations stats
 * Including ?extended in the query string fetches Elasticsearch cluster_uuid
 * - Requests to set isExtended = true
 *      GET /api/stats?extended=true
 *      GET /api/stats?extended
 * - No value or 'false' is isExtended = false
 * - Any other value causes a statusCode 400 response (Bad Request)
 */
export function registerStatsApi(kbnServer, server, config, collector) {
  const wrapAuth = wrapAuthConfig(config.get('status.allowAnonymous'));
  server.route(
    wrapAuth({
      method: 'GET',
      path: '/api/stats',
      config: {
        validate: {
          query: {
            extended: Joi.string().valid('', 'true', 'false')
          }
        },
        tags: ['api'],
      },
      async handler(req, reply) {
        const { extended } = req.query;
        const isExtended = extended !== undefined && extended !== 'false';

        let clusterUuid;
        if (isExtended) {
          try {
            const { callWithRequest, } = server.plugins.elasticsearch.getCluster('data');
            const { cluster_uuid: uuid } = await callWithRequest(req, 'info', { filterPath: 'cluster_uuid', });
            clusterUuid = uuid;
          } catch (err) {
            clusterUuid = undefined; // fallback from anonymous access or auth failure, redundant for explicitness
          }
        }

        const stats = {
          cluster_uuid: clusterUuid, // serialization makes an undefined get stripped out, as undefined isn't a JSON type
          status: kbnServer.status.toJSON(),
          ...collector.getStats(),
        };

        reply(stats);
      },
    })
  );
}
