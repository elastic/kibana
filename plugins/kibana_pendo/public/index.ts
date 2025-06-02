import './index.scss';

import { KibanaPendoPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new KibanaPendoPlugin();
}
export { KibanaPendoPluginSetup, KibanaPendoPluginStart } from './types';
