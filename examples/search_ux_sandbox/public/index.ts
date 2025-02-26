import { SearchUxSandboxPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new SearchUxSandboxPlugin();
}
export type { SearchUxSandboxPluginSetup, SearchUxSandboxPluginStart } from './types';
