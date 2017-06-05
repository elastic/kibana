export function registerLanguages(server) {
  server.route({
    path: '/api/kibana/scripts/languages',
    method: 'GET',
    handler: function (request, reply) {
      reply(['painless', 'expression']);
    }
  });
}
