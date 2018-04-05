import { wrapAuthConfig } from '../../wrap_auth_config';

export function registerStatusPage(kbnServer, server, config) {
  const wrapAuth = wrapAuthConfig(config.get('status.allowAnonymous'));

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
