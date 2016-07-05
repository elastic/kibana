import Boom from 'boom';

export default function registerSet(server) {
  server.route({
    path: '/api/kibana/settings',
    method: 'POST',
    handler: function (req, reply) {
      const { key } = req.params;
      const { changes } = req.payload;
      const uiSettings = server.uiSettings();
      uiSettings
        .setMany(changes)
        .then(() => uiSettings
          .getUserProvided()
          .then(settings => reply({ settings }).type('application/json'))
        )
        .catch(reason => reply(Boom.wrap(reason)));
    }
  });
}
