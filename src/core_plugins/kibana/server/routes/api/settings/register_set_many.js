import Boom from 'boom';

export default function registerSet(server) {
  server.route({
    path: '/api/kibana/settings',
    method: 'POST',
    handler: function (req, reply) {
      const { changes } = req.payload;
      const uiSettings = req.getUiSettingsService();

      uiSettings
        .setMany(changes)
        .then(() => uiSettings
          .getUserProvided()
          .then(settings => reply({ settings }).type('application/json'))
        )
        .catch(err => reply(Boom.wrap(err, err.statusCode)));
    }
  });
}
