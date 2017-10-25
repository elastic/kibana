import { argTypeSpecs } from '../expression_types/arg_types';
import { datasourceSpecs } from '../expression_types/datasources';
import { modelSpecs } from '../expression_types/models';
import { transformSpecs } from '../expression_types/transforms';
import { viewSpecs } from '../expression_types/views';
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
argTypeSpecs.forEach(expFn => addArgType(expFn()));
datasourceSpecs.forEach(expFn => addExpressionType('datasource', expFn()));
modelSpecs.forEach(expFn => addExpressionType('model', expFn()));
transformSpecs.forEach(expFn => addExpressionType('transform', expFn()));
viewSpecs.forEach(expFn => addExpressionType('view', expFn()));
