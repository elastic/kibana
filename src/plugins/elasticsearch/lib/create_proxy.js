import createAgent from './create_agent';
import mapUri from './map_uri';
import { resolve } from 'url';

function createProxy(server, method, route, config) {

  const options = {
    method: method,
    path: createProxy.createPath(route),
    handler: {
      proxy: {
        mapUri: mapUri(server),
        passThrough: true,
        agent: createAgent(server),
        xforward: true
      }
    },
  };

  if (config) options.config = config;

  server.route(options);
};

createProxy.createPath = function createPath(path) {
  const pre = '/elasticsearch';
  const sep = path[0] === '/' ? '' : '/';
  return `${pre}${sep}${path}`;
};

module.exports = createProxy;
