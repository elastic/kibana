import Boom from 'boom';
import { assign } from 'lodash';
import defaultsProvider from './defaults';

export default function registerGet(server) {
  server.route({
    path: '/api/kibana/settings',
    method: 'GET',
    handler: async function (req, reply) {
      const defaults = defaultsProvider();
      const client = server.plugins.elasticsearch.client;
      const config = server.config();
      const index = config.get('kibana.index');
      const id = config.get('pkg.version');
      const type = 'config';

      client
        .get({ index, type, id })
        .then(res => res._source)
        .then(user => assign(defaults, user, markCustom))
        .then(settings => reply({ settings }).type('application/json'))
        .catch(reason => reply(Boom.wrap(reason)));
    }
  });
}

function markCustom(current, following) {
  if (following && following.value !== null) {
    following.custom = true;
    return following;
  }
  return current;
}
