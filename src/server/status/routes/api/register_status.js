import { wrapAuthConfig } from '../../wrap_auth_config';

const matchSnapshot = /-SNAPSHOT$/;

export function registerStatusApi(kbnServer, server, config) {
  const wrapAuth = wrapAuthConfig(config.get('status.allowAnonymous'));

  server.route(wrapAuth({
    method: 'GET',
    path: '/api/status',
    config: {
      tags: ['api']
    },
    async handler(request, reply) {
      const status = {
        name: config.get('server.name'),
        uuid: config.get('server.uuid'),
        version: {
          number: config.get('pkg.version').replace(matchSnapshot, ''),
          build_hash: config.get('pkg.buildSha'),
          build_number: config.get('pkg.buildNum'),
          build_snapshot: matchSnapshot.test(config.get('pkg.version'))
        },
        status: kbnServer.status.toJSON(),
        metrics: kbnServer.metrics
      };

      return reply(status);
    }
  }));
}
