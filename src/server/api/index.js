module.exports = function (kbnServer, server, config) {
  server.route({
    path: '/api/hello',
    method: 'POST',
    handler: function (req, reply) {
      console.log(req.payload.title);
      return reply('Hello, world!');
    }
  });
};
