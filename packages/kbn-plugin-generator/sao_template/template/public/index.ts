<%_ if (hasScss) { -%>
import './index.scss';
<%_ } -%>

import { <%= upperCamelCaseName %>Plugin } from './plugin';

// These exports are the public contract for your static code and types.
export function plugin() {
  return new <%= upperCamelCaseName %>Plugin();
}
export {
  <%= upperCamelCaseName %>PluginSetup,
  <%= upperCamelCaseName %>PluginStart,
} from './types';

