import { routes } from './server/routes';
import { functions } from './server/lib/functions';
import { serverFunctions } from './server/functions';

import { commonFunctions } from './common/functions';
import { typeSpecs } from './common/types';

import { types } from './common/lib/types';

export default function (server, /*options*/) {
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

  const { addFunction, addType } = server.plugins.canvas;
  serverFunctions.forEach(addFunction);
  commonFunctions.forEach(addFunction);
  typeSpecs.forEach(addType);

  // Load routes here
  routes(server);
}
