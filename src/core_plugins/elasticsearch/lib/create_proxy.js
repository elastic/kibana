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
          const upstreamLocation = responseFromUpstream.headers.location;
          const response = reply(err, responseFromUpstream);

          // Workaround for #8705 until hapi has been updated to >= 15.0.0
          if (upstreamLocation) {
            delete responseFromUpstream.headers.location;
            response.location(encodeURI(upstreamLocation));
          }
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
