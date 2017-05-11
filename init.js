import { routes } from './server/routes';
import { functions } from './server/lib/functions';
import { serverFunctions } from './server/functions';

import {
  argTypeRegistry,
  datasourceRegistry,
  transformRegistry,
  modelRegistry,
  viewRegistry,
} from './public/expression_types';

import expressionArgTypes from './public/expression_types/arg_types';
import expressionDatasources from './public/expression_types/datasources';
import expressionTransforms from './public/expression_types/transforms';
import expressionModels from './public/expression_types/models';
import expressionViews from './public/expression_types/views';

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

    addExpressionType(typeName, expFn) {
      switch(typeName) {
        case 'datasource':
          datasourceRegistry.register(expFn);
          break;
        case 'transform':
          transformRegistry.register(expFn);
          break;
        case 'model':
          modelRegistry.register(expFn);
          break;
        case 'view':
          viewRegistry.register(expFn);
          break;
        default:
          throw new Error(`Unknown expression type: ${typeName}`);
      }
    },

    addArgType(expFn) {
      argTypeRegistry.register(expFn);
    },
  };

  const { addFunction, addType, addExpressionType, addArgType } = server.plugins.canvas;
  serverFunctions.forEach(addFunction);
  commonFunctions.forEach(addFunction);
  typeSpecs.forEach(addType);

  // register default args, arg types, and expression types
  expressionArgTypes.forEach(expFn => addArgType(expFn()));
  expressionDatasources.forEach(expFn => addExpressionType('datasource', expFn()));
  expressionTransforms.forEach(expFn => addExpressionType('transform', expFn()));
  expressionModels.forEach(expFn => addExpressionType('model', expFn()));
  expressionViews.forEach(expFn => addExpressionType('view', expFn()));

  // Load routes here
  routes(server);
}
