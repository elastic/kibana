import Boom from 'boom';
import { defaultsDeep } from 'lodash';
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
        .then(user => defaultsDeep(hydrateUserSettings(user), defaults))
        .then(settings => reply({ settings }).type('application/json'))
        .catch(reason => reply(Boom.wrap(reason)));
    }
  });
}

function hydrateUserSettings(user) {
  return Object.keys(user).reduce(expand, {});
  function expand(expanded, key) {
    const userValue = user[key];
    if (userValue !== null) {
      expanded[key] = { userValue };
    }
    return expanded;
  }
}
