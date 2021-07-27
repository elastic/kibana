import { PluginInitializerContext } from '../../../core/server';
import { FieldFormatsPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new FieldFormatsPlugin(initializerContext);
}

export { FieldFormatsPluginSetup, FieldFormatsPluginStart } from './types';
