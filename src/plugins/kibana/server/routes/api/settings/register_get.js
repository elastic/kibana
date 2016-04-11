import defaultsProvider from './defaults';

export default function registerGet(server) {
  server.route({
    path: '/api/kibana/settings',
    method: 'GET',
    handler: function (req, reply) {
      const defaults = defaultsProvider();
      const settings = defaults;

      reply(settings).type('application/json');
    }
  });
}
