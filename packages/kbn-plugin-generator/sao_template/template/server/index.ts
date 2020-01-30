import { PluginInitializerContext } from '<%= relRoot %>/src/core/server';
import { <%= upperCamelCaseName %>Plugin } from './plugin';

// These exports are the server side contract for your static code and types.
export function plugin(initializerContext: PluginInitializerContext) {
  return new <%= upperCamelCaseName %>Plugin(initializerContext);
}

export {
  <%= upperCamelCaseName %>PluginSetup,
  <%= upperCamelCaseName %>PluginStart,
} from './types';
