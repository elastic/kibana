

import { PluginInitializerContext } from '<%= relRoot %>/src/core/public';
export function plugin(initializerContext: PluginInitializerContext) {
  return new <%= camelCaseName %>PublicPlugin(initializerContext);
}

export * from '../common';
export * from './types';

// Export plugin after all other imports
import { <%= camelCaseName %>PublicPlugin } from './plugin';
export { <%= camelCaseName %>PublicPlugin as Plugin };