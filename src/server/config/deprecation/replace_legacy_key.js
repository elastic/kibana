import { noop } from 'lodash';

export function createReplaceLegacyKey(legacySettings) {
  return function (key, log = noop) {
    const newKey = legacySettings[key];
    if (newKey) {
      log(`Config key ${key} is deprecated. It has been replaced with ${newKey}`);
      return newKey;
    }

    return key;
  };
}
