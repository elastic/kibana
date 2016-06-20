export default function (server) {

  server.route({
    path: '/api/i18n/default',
    method: 'GET',
    handler(req, reply) {
      reply('Hello World!');
    }
  });

};

