import { PluginInitializerContext } from '../../../core/server';
import { ContentPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new ContentPlugin(initializerContext);
}

export { ContentPluginSetup, ContentPluginStart } from './types';
