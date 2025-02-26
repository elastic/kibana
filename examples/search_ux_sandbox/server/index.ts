import type { PluginInitializerContext } from '@kbn/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { SearchUxSandboxPlugin } = await import('./plugin');
  return new SearchUxSandboxPlugin(initializerContext);
}

export type { SearchUxSandboxPluginSetup, SearchUxSandboxPluginStart } from './types';
