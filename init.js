import { routes } from './server/routes';
import { serverFunctions } from './server/lib/function_registry';
import { types } from './common/lib/type_registry';

module.exports = function (server, /*options*/) {
  server.plugins.canvas = {
    kibanaType: 'canvas_1',
    /*
      For now, portable/common functions must be added to both the client and the server.
      server.plugins.canvas.addFunction(require('./someFunction'))
    */

    addFunction(fnDef) {
      serverFunctions.push(fnDef);
    },

    addType(typeDef) {
      types.push(typeDef);
    }
  };

  server.plugins.canvas.addFunction(require('./server/functions/demodata/demodata'));
  server.plugins.canvas.addFunction(require('./common/functions/mapColumn/mapColumn'));
  server.plugins.canvas.addFunction(require('./common/functions/sort/sort'));
  server.plugins.canvas.addFunction(require('./common/functions/render/render'));


  server.plugins.canvas.addType(require('./common/types/datatable'));
  server.plugins.canvas.addType(require('./common/types/number'));
  server.plugins.canvas.addType(require('./common/types/string'));

  // Load routes here
  routes(server);
};
