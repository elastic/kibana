
export function registerTutorials(server) {
  server.route({
    path: '/api/kibana/home/tutorials',
    method: ['GET'],
    handler: async function (req, reply) {
      reply(server.getTutorials());
    }
  });
}
