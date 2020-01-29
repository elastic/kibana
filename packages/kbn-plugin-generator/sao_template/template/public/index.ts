import { <%= upperCamelCaseName %>PublicPlugin } from './plugin';

export function plugin() {
  return new <%= upperCamelCaseName %>PublicPlugin();
}

export * from '../common';
export * from './types';

