import { PluginInitializerContext } from '../../../core/server';
import { ProfilingPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new ProfilingPlugin(initializerContext);
}

export { ProfilingPluginSetup, ProfilingPluginStart } from './types';
