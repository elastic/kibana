import './index.scss';

import { VersionBranchingExamplesPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new VersionBranchingExamplesPlugin();
}
export { VersionBranchingExamplesPluginSetup, VersionBranchingExamplesPluginStart } from './types';
