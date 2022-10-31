import './index.scss';

import { FilesManagementPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new FilesManagementPlugin();
}
export { FilesManagementPluginSetup, FilesManagementPluginStart } from './types';
