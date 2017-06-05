import Boom from 'boom';

export default function registerGet(server) {
  server.route({
    path: '/api/kibana/settings',
    method: 'GET',
    handler: function (req, reply) {
      server
        .uiSettings()
        .getUserProvided(req)
        .then(settings => reply({ settings }).type('application/json'))
        .catch(err => reply(Boom.wrap(err, err.statusCode)));
    }
  });
}
