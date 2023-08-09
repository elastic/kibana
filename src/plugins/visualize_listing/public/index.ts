import './index.scss';

import { VisualizeListingPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new VisualizeListingPlugin();
}
export type { VisualizeListingPluginSetup, VisualizeListingPluginStart } from './types';
