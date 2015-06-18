var createAgent = require('./create_agent');
var mapUri = require('./map_uri');
module.exports = function createProxy(server, method, route, opts) {
  opts = opts || {};
  var options = {
    method: method,
    path: route,
    handler: {
      proxy: {
        mapUri: mapUri(server, opts.prefix),
        passThrough: true,
        agent: createAgent(server)
      }
    }
  };
  if (opts && opts.config) options.config = opts.config;
  server.route(options);
};

