import { forOwn, has, noop } from 'lodash';

// deprecated settings are still allowed, but will be removed at a later time. They
// are checked for after the config object is prepared and known, so legacySettings
// will have already been transformed.
export const deprecatedSettings = new Map([
  [['server', 'xsrf', 'token'], 'server.xsrf.token is deprecated. It is no longer used when providing xsrf protection.']
]);

// check for and warn about deprecated settings
export function checkForDeprecatedConfig(object, log = noop) {
  for (const [key, msg] of deprecatedSettings.entries()) {
    if (has(object, key)) log(msg);
  }
  return object;
}
