<%_ if (hasScss) { -%>
import './index.scss';
<%_ } -%>

import { <%= upperCamelCaseName %>Plugin } from './plugin';

// This exports static code and TypeScript types, 
// as well as, Kibana Platform `plugin()` initializer. 
export function plugin() {
  return new <%= upperCamelCaseName %>Plugin();
}
export {
  <%= upperCamelCaseName %>PluginSetup,
  <%= upperCamelCaseName %>PluginStart,
} from './types';

