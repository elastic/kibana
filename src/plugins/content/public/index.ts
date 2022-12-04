import './index.scss';

import { ContentPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new ContentPlugin();
}
export { ContentPluginSetup, ContentPluginStart } from './types';
