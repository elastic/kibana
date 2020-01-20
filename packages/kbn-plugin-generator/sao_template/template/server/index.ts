import { PluginInitializerContext } from '<%= relRoot %>/src/core/server';
import { <%= upperCamelCaseName %>ServerPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new <%= upperCamelCaseName %>ServerPlugin(initializerContext);
}

export { <%= upperCamelCaseName %>ServerPlugin as Plugin };
export * from '../common';
