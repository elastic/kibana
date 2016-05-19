import Boom from 'boom';

export default function registerGet(server) {
  server.route({
    path: '/api/kibana/settings',
    method: 'GET',
    handler: function (req, reply) {
      server
        .uiSettings()
        .getUserProvided()
        .then(settings => reply({ settings }).type('application/json'))
        .catch(reason => reply(Boom.wrap(reason)));
    }
  });
}
