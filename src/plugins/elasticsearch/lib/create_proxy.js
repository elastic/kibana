import createAgent from './create_agent';
import mapUri from './map_uri';
import { resolve } from 'url';
import { assign } from 'lodash';

function createProxy(server, method, route, config) {

  const options = {
    method: method,
    path: createProxy.createPath(route),
    config: {
      timeout: {
        socket: server.config().get('elasticsearch.requestTimeout')
      }
    },
    handler: {
      proxy: {
        mapUri: mapUri(server),
        agent: createAgent(server),
        xforward: true,
        timeout: server.config().get('elasticsearch.requestTimeout'),
        onResponse: function (err, responseFromUpstream, request, reply) {
          reply(err, responseFromUpstream);
        }
      }
    },
  };

  assign(options.config, config);

  server.route(options);
};

createProxy.createPath = function createPath(path) {
  const pre = '/elasticsearch';
  const sep = path[0] === '/' ? '' : '/';
  return `${pre}${sep}${path}`;
};

module.exports = createProxy;
