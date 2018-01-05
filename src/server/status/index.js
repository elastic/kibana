import ServerStatus from './server_status';
import wrapAuthConfig from './wrap_auth_config';
import { Metrics } from './metrics';

export default function (kbnServer, server, config) {
  kbnServer.status = new ServerStatus(kbnServer.server);

  if (server.plugins['even-better']) {
    const metrics = new Metrics(config, server);

    server.plugins['even-better'].monitor.on('ops', event => {
      metrics.capture(event).then(data => { kbnServer.metrics = data; });
    });
  }

  const wrapAuth = wrapAuthConfig(config.get('status.allowAnonymous'));
  const matchSnapshot = /-SNAPSHOT$/;
  server.route(wrapAuth({
    method: 'GET',
    path: '/api/status',
    config: {
      tags: ['api']
    },
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
        status: kbnServer.status.toJSON(),
        metrics: kbnServer.metrics
      };

      return reply(status);
    }
  }));

  server.decorate('reply', 'renderStatusPage', async function () {
    const app = server.getHiddenUiAppById('status_page');
    const reply = this;
    const response = app
      ? await reply.renderApp(app)
      : reply(kbnServer.status.toString());

    if (response) {
      response.code(kbnServer.status.isGreen() ? 200 : 503);
      return response;
    }
  });

  server.route(wrapAuth({
    method: 'GET',
    path: '/status',
    handler(request, reply) {
      reply.renderStatusPage();
    }
  }));
}
