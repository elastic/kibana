import type { PluginInitializerContext } from '@kbn/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { WorkflowsPlugin } = await import('./plugin');
  return new WorkflowsPlugin(initializerContext);
}

export type { WorkflowsPluginSetup, WorkflowsPluginStart } from './types';
