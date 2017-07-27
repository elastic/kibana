export default function registerGet(server) {

  async function handleRequest(request) {
    const uiSettings = request.getUiSettingsService();
    return {
      settings: await uiSettings.getUserProvided()
    };
  }

  server.route({
    path: '/api/kibana/settings',
    method: 'GET',
    handler: function (request, reply) {
      reply(handleRequest(request));
    }
  });
}
