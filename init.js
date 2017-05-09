import { routes } from './server/routes';
import { functions } from './server/lib/functions';
import { serverFunctions } from './server/functions';
import { commonFunctions } from './common/functions';
import { typeSpecs } from './common/types';

import { types } from './common/lib/types';

module.exports = function (server, /*options*/) {
  server.plugins.canvas = {
    kibanaType: 'canvas_1',
    /*
      For now, portable/common functions must be added to both the client and the server.
      server.plugins.canvas.addFunction(require('./someFunction'))
    */

    addFunction(fnDef) {
      functions.register(fnDef);
    },

    addType(typeDef) {
      types.register(typeDef);
    },
  };

  serverFunctions.forEach(server.plugins.canvas.addFunction);
  commonFunctions.forEach(server.plugins.canvas.addFunction);
  typeSpecs.forEach(server.plugins.canvas.addType);

  // Load routes here
  routes(server);
};
