import { routes } from './server/routes'

module.exports = function (server, /*options*/) {
  server.plugins.canvas = {
    kibanaType: 'canvas_1'
  };

  // Load routes here
  routes(server);
};
