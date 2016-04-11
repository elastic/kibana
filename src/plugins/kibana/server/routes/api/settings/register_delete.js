import Boom from 'boom';

export default function registerDelete(server) {
  server.route({
    path: '/api/kibana/settings/{key}',
    method: 'DELETE',
    handler: async function (req, reply) {
      const key = req.params.key;
      const client = server.plugins.elasticsearch.client;
      const config = server.config();
      const index = config.get('kibana.index');
      const id = config.get('pkg.version');
      const type = 'config';

      client
        .update({
          index,
          type,
          id,
          body: {
            doc: {
              [key]: null
            }
          }
        })
        .then(() => reply({}).type('application/json'))
        .catch(reason => reply(Boom.wrap(reason)));
    }
  });
}
