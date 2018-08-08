export default function (server) {

  server.route({
    path: '/api/<%= name %>/example',
    method: 'GET',
    handler(req, reply) {
      reply({ time: (new Date()).toISOString() });
    }
  });

}
