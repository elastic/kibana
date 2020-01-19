import { PluginInitializerContext } from '<%= relRoot %>/src/core/server';
import { <%= camelCaseName %>ServerPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new <%= camelCaseName %>ServerPlugin(initializerContext);
}

export { <%= camelCaseName %>ServerPlugin as Plugin };
export * from '../common';