import createAgent from './create_agent';
import mapUri from './map_uri';
import { resolve } from 'url';
import { assign } from 'lodash';

function createProxy(server, method, path, config) {
  const proxies = new Map([
    ['/elasticsearch', server.plugins.elasticsearch.dataClient],
    ['/es_admin', server.plugins.elasticsearch.adminClient]
  ]);

  const responseHandler = function (err, upstreamResponse, request, reply) {
    if (err) {
      reply(err);
      return;
    }

    if (upstreamResponse.headers.location) {
      // TODO: Workaround for #8705 until hapi has been updated to >= 15.0.0
      upstreamResponse.headers.location = encodeURI(upstreamResponse.headers.location);
    }

    reply(null, upstreamResponse);
  };

  for (let [proxyPrefix, esClient] of proxies) {
    const options = {
      method: method,
      path: createProxy.createPath(proxyPrefix, path),
      config: {
        timeout: {
          socket: server.config().get('elasticsearch.requestTimeout')
        }
      },
      handler: {
        proxy: {
          mapUri: mapUri(server, esClient, proxyPrefix),
          agent: createAgent(server),
          xforward: true,
          timeout: server.config().get('elasticsearch.requestTimeout'),
          onResponse: responseHandler
        }
      },
    };

    console.log(options);

    assign(options.config, config);

    server.route(options);
  }
};

createProxy.createPath = function createPath(prefix, path) {
  path = path[0] === '/' ? path : `/${path}`;
  prefix = prefix[0] === '/' ? prefix : `/${prefix}`;

  return `${prefix}${path}`;
};

module.exports = createProxy;
