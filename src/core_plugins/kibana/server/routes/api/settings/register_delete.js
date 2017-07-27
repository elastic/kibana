export default function registerDelete(server) {

  async function handleRequest(request) {
    const { key } = request.params;
    const uiSettings = request.getUiSettingsService();

    await uiSettings.remove(key);
    return {
      settings: await uiSettings.getUserProvided()
    };
  }

  server.route({
    path: '/api/kibana/settings/{key}',
    method: 'DELETE',
    handler(request, reply) {
      reply(handleRequest(request));
    }
  });
}
