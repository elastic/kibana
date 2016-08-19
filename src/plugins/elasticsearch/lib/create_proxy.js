const createAgent = require('./create_agent');
const mapUri = require('./map_uri');
const { resolve } = require('url');
const { assign } = require('lodash');

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
