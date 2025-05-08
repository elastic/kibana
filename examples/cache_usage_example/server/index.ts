import type { PluginInitializerContext } from '@kbn/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { CacheUsagePlugin } = await import('./plugin');
  return new CacheUsagePlugin(initializerContext);
}

export type { CacheUsagePluginSetup, CacheUsagePluginStart } from './types';
