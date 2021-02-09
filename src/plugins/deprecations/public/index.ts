import './index.scss';

import { DeprecationsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new DeprecationsPlugin();
}
export { DeprecationsPluginSetup, DeprecationsPluginStart } from './types';
