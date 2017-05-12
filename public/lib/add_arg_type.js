import { argTypeRegistry } from '../expression_types';

export function addArgType(expFn) {
  argTypeRegistry.register(expFn);
}
