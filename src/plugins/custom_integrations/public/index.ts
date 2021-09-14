import './index.scss';

import { CustomIntegrationsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new CustomIntegrationsPlugin();
}
export { CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart } from './types';
