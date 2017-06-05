import Boom from 'boom';

export default function registerDelete(server) {
  server.route({
    path: '/api/kibana/settings/{key}',
    method: 'DELETE',
    handler: function (req, reply) {
      const { key } = req.params;
      const uiSettings = server.uiSettings();
      uiSettings
        .remove(req, key)
        .then(() => uiSettings
          .getUserProvided(req)
          .then(settings => reply({ settings }).type('application/json'))
        )
        .catch(err => reply(Boom.wrap(err, err.statusCode)));
    }
  });
}
