import { PluginInitializerContext } from '../../../core/server';
import { CustomIntegrationsPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new CustomIntegrationsPlugin(initializerContext);
}

export { CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart, CustomIntegration } from './types';
