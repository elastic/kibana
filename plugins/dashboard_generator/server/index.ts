import { PluginInitializerContext } from '../../../src/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { DashboardGeneratorPlugin } = await import('./plugin');
  return new DashboardGeneratorPlugin(initializerContext);
}

export type { DashboardGeneratorPluginSetup, DashboardGeneratorPluginStart } from './types';
