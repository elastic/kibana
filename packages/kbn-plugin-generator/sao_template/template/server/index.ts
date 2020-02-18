import { PluginInitializerContext } from '<%= relRoot %>/src/core/server';
import { <%= upperCamelCaseName %>Plugin } from './plugin';


//  This exports static code and TypeScript types, 
//  as well as, Kibana Platform `plugin()` initializer.
 
 export function plugin(initializerContext: PluginInitializerContext) {
  return new <%= upperCamelCaseName %>Plugin(initializerContext);
}

export {
  <%= upperCamelCaseName %>PluginSetup,
  <%= upperCamelCaseName %>PluginStart,
} from './types';
