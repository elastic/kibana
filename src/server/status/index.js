import ServerStatus from './server_status';
import wrapAuthConfig from './wrap_auth_config';

export default function (kbnServer, server, config) {
  kbnServer.status = new ServerStatus(kbnServer.server);

  if (server.plugins['even-better']) {
    kbnServer.mixin(require('./metrics').collectMetrics);
  }

  const wrapAuth = wrapAuthConfig(config.get('status.allowAnonymous'));
  const matchSnapshot = /-SNAPSHOT$/;
  server.route(wrapAuth({
    method: 'GET',
    path: '/api/status',
    handler: function (request, reply) {
      const v6Format = config.get('status.v6ApiFormat');
      if (v6Format) {
        return reply({
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
        });
      }

      return reply({
        name: config.get('server.name'),
        version: config.get('pkg.version'),
        buildNum: config.get('pkg.buildNum'),
        buildSha: config.get('pkg.buildSha'),
        uuid: config.get('server.uuid'),
        status: kbnServer.status.toJSON(),
        metrics: kbnServer.legacyMetrics
      });
    }
  }));

  server.decorate('reply', 'renderStatusPage', async function () {
    const app = kbnServer.uiExports.getHiddenApp('status_page');
    const response = await getResponse(this);
    response.code(kbnServer.status.isGreen() ? 200 : 503);
    return response;

    function getResponse(ctx) {
      if (app) {
        return ctx.renderApp(app);
      }
      return ctx(kbnServer.status.toString());
    }
  });

  server.route(wrapAuth({
    method: 'GET',
    path: '/status',
    handler: function (request, reply) {
      return reply.renderStatusPage();
    }
  }));
}
