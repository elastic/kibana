export function plugin() {
  return new <%= upperCamelCaseName %>PublicPlugin();
}

export * from '../common';
export * from './types';

// Export plugin after all other imports
import { <%= upperCamelCaseName %>PublicPlugin } from './plugin';
export { <%= upperCamelCaseName %>PublicPlugin as Plugin };
