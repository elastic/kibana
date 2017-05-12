import {
  datasourceRegistry,
  transformRegistry,
  modelRegistry,
  viewRegistry,
} from '../expression_types';

export function addExpressionType(typeName, expFn) {
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
}
