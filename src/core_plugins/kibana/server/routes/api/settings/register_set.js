import Boom from 'boom';

export default function registerSet(server) {
  server.route({
    path: '/api/kibana/settings/{key}',
    method: 'POST',
    handler: function (req, reply) {
      const { key } = req.params;
      const { value } = req.payload;
      const uiSettings = server.uiSettings();
      uiSettings
        .set(req, key, value)
        .then(() => uiSettings
          .getUserProvided(req)
          .then(settings => reply({ settings }).type('application/json'))
        )
        .catch(err => reply(Boom.wrap(err, err.statusCode)));
    }
  });
}
