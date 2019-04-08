export default function (server) {

  server.route({
    path: '/api/<%= name %>/example',
    method: 'GET',
    handler() {
      return { time: (new Date()).toISOString() };
    }
  });

}
