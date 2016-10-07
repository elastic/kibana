import { noop, transform } from 'lodash';
import { legacySettings } from '../../server/config/deprecation/legacy_settings';

// transform legacy options into new namespaced versions
export function rewriteLegacyConfig(object, log = noop) {
  return transform(object, (clone, val, key) => {
    if (legacySettings.hasOwnProperty(key)) {
      const replacement = legacySettings[key];
      log(`Config key "${key}" is deprecated. It has been replaced with "${replacement}"`);
      clone[replacement] = val;
    } else {
      clone[key] = val;
    }
  }, {});
}
