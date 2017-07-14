import expressionArgTypes from '../expression_types/arg_types';
import expressionDatasources from '../expression_types/datasources';
import expressionTransforms from '../expression_types/transforms';
import expressionModels from '../expression_types/models';
import expressionViews from '../expression_types/views';
import {
  argTypeRegistry,
  datasourceRegistry,
  transformRegistry,
  modelRegistry,
  viewRegistry,
} from '../expression_types';

function addArgType(expFn) {
  argTypeRegistry.register(expFn);
}

function addExpressionType(typeName, expObj) {
  switch(typeName) {
    case 'datasource':
      datasourceRegistry.register(expObj);
      break;
    case 'transform':
      transformRegistry.register(expObj);
      break;
    case 'model':
      modelRegistry.register(expObj);
      break;
    case 'view':
      viewRegistry.register(expObj);
      break;
    default:
      throw new Error(`Unknown expression type: ${typeName}`);
  }
}

// register default args, arg types, and expression types
expressionArgTypes.forEach(expFn => addArgType(expFn()));
expressionDatasources.forEach(expFn => addExpressionType('datasource', expFn()));
expressionTransforms.forEach(expFn => addExpressionType('transform', expFn()));
expressionModels.forEach(expFn => addExpressionType('model', expFn()));
expressionViews.forEach(expFn => addExpressionType('view', expFn()));
