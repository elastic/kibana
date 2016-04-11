import Boom from 'boom';
import { assign } from 'lodash';
import defaultsProvider from './defaults';

export default function registerSet(server) {
  server.route({
    path: '/api/kibana/settings/{key}',
    method: 'POST',
    handler: async function (req, reply) {
      const key = req.params.key;
      const value = req.query.value;
      const client = server.plugins.elasticsearch.client;
      const config = server.config();
      const index = config.get('kibana.index');
      const id = config.get('pkg.version');
      const type = 'config';
      const clear = value === null || value === undefined;

      client.update({
        index,
        type,
        id,
        body: {
          doc: {
            [key]: clear ? null : value
          }
        }
      });

      reply({}).type('application/json');
    }
  });
}
