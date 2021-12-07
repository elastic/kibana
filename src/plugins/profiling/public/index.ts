import './index.scss';

import { ProfilingPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new ProfilingPlugin();
}
export { ProfilingPluginSetup, ProfilingPluginStart } from './types';
