import { PluginInitializerContext } from '@kbn/core/server';
import { VisualizeListingPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisualizeListingPlugin(initializerContext);
}

export type { VisualizeListingPluginSetup, VisualizeListingPluginStart } from './types';
