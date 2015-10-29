module.exports = function (kibana) {

  return new kibana.Plugin({

    init: function (server, options) {

      server.route({
        path: '/api/index-patterns',
        method: 'GET',
        handler: function (req, reply) {
          return reply('GET Hello, world!');
        }
      });

      server.route({
        path: '/api/index-patterns',
        method: 'POST',
        handler: function (req, reply) {
          console.log(req.payload.title);
          return reply('POST Hello, world!');
        }
      });

    }
  });
};
