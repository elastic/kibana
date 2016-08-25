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
        passThrough: true,
        agent: createAgent(server),
        xforward: true,
        timeout: server.config().get('elasticsearch.requestTimeout'),
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
