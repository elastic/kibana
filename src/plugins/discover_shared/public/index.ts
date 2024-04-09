import './index.scss';

import { DiscoverSharedPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new DiscoverSharedPlugin();
}
export type { DiscoverSharedPluginSetup, DiscoverSharedPluginStart } from './types';
