import _ from 'lodash';
import ServerStatus from './server_status';
import wrapAuthConfig from './wrap_auth_config';
import { join } from 'path';

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
      const status = {
        name: config.get('server.name'),
        uuid: config.get('server.uuid'),
        version: {
          number: config.get('pkg.version').replace(matchSnapshot, ''),
          build_hash: config.get('pkg.buildSha'),
          build_number: config.get('pkg.buildNum'),
          build_snapshot: matchSnapshot.test(config.get('pkg.version'))
        },
        status: kbnServer.status.toJSON()
      };

      if (config.get('status.metrics')) {
        status.metrics = kbnServer.metrics;
      }

      return reply(status);
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
