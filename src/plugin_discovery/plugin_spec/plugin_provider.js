import { resolve } from 'path';

import { createInvalidPluginError } from '../errors';

export function loadPluginProvider(kibanaJson, pluginPath) {
  let provider;
  try {
    provider = require(resolve(pluginPath));
  } catch (error) {
    throw createInvalidPluginError(kibanaJson.id, pluginPath, error.message);
  }

  if (provider.__esModule) {
    provider = provider.default;
  }

  if (typeof provider !== 'function') {
    throw createInvalidPluginError(kibanaJson.id, pluginPath, 'must export a function');
  }

  return provider;
}
