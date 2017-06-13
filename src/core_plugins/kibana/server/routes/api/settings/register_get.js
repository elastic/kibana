import Boom from 'boom';

export default function registerGet(server) {
  server.route({
    path: '/api/kibana/settings',
    method: 'GET',
    handler: function (req, reply) {
      req
        .getUiSettingsService()
        .getUserProvided()
        .then(settings => reply({ settings }).type('application/json'))
        .catch(err => reply(Boom.wrap(err, err.statusCode)));
    }
  });
}
