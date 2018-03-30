import { PluginPack } from './plugin_pack';
import { createInvalidPackError } from '../errors';

export function createPack(packageJson) {
  let provider = require(packageJson.directoryPath);
  if (provider.__esModule) {
    provider = provider.default;
  }
  if (typeof provider !== 'function') {
    throw createInvalidPackError(packageJson.directoryPath, 'must export a function');
  }

  return new PluginPack({ path: packageJson.directoryPath, pkg: packageJson.contents, provider });
}
