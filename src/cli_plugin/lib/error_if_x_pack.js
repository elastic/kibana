import { isOSS } from './is_oss';

function isXPack(plugin) {
  return /x-pack/.test(plugin);
}

export function errorIfXPackInstall(settings) {
  if (isXPack(settings.plugin)) {
    if (isOSS()) {
      throw new Error(
        'You are using the OSS-only distribution of Kibana.  ' +
        'As of version 6.3+ X-Pack is bundled in the standard distribution of this software by default; ' +
        'consequently it is no longer available as a plugin. Please use the standard distribution of Kibana to use X-Pack features.'
      );
    } else {
      throw new Error(
        'Kibana now contains X-Pack by default, there is no longer any need to install it as it is already present.'
      );
    }
  }
}

export function errorIfXPackRemove(settings) {
  if (isXPack(settings.plugin) && !isOSS()) {
    throw new Error(
      'You are using the standard distrbution of Kibana.  Please install the OSS-only distribution to remove X-Pack features.'
    );
  }
}
