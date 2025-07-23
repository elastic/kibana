import { WorkflowsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new WorkflowsPlugin();
}
export type { WorkflowsPluginSetup, WorkflowsPluginStart } from './types';
