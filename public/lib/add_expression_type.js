import {
  datasourceRegistry,
  transformRegistry,
  modelRegistry,
  viewRegistry,
} from '../expression_types';

export function addExpressionType(typeName, expObj) {
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
