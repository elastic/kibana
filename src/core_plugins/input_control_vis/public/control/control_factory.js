import { rangeControlFactory } from './range_control_factory';
import { listControlFactory } from './list_control_factory';

export function controlFactory(controlParams) {
  let factory = null;
  switch (controlParams.type) {
    case 'range':
      factory = rangeControlFactory;
      break;
    case 'list':
      factory = listControlFactory;
      break;
    default:
      throw new Error(`Unhandled control type ${controlParams.type}`);
  }
  return factory;
}
