import { routes } from './server/routes';
import { serverFunctions } from './server/lib/function_registry';

module.exports = function (server, /*options*/) {
  server.plugins.canvas = {
    kibanaType: 'canvas_1',
    /*
      For now, portable/common functions must be added to both the client and the server.
      server.plugins.canvas.addFunction(require('./someFunction'))
    */

    addFunction(fnDef) {
      serverFunctions.push(fnDef);
    }
  };

  server.plugins.canvas.addFunction(require('./server/functions/demodata/demodata'));
  server.plugins.canvas.addFunction(require('./common/functions/mapColumn/mapColumn'));

  // Load routes here
  routes(server);
};
