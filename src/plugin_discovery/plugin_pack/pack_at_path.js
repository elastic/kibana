import { Observable } from 'rxjs';
import { resolve } from 'path';
import { createInvalidPackError } from '../errors';

import { isDirectory } from './lib';
import { PluginPack } from './plugin_pack';

async function createPackAtPath(path) {
  if (!await isDirectory(path)) {
    throw createInvalidPackError(path, 'must be a directory');
  }

  let pkg;
  try {
    pkg = require(resolve(path, 'package.json'));
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw createInvalidPackError(path, 'must have a package.json file');
    }
  }

  if (!pkg || typeof pkg !== 'object') {
    throw createInvalidPackError(path, 'must have a valid package.json file');
  }

  let provider = require(path);
  if (provider.__esModule) {
    provider = provider.default;
  }
  if (typeof provider !== 'function') {
    throw createInvalidPackError(path, 'must export a function');
  }

  return new PluginPack({ path, pkg, provider });
}

export const createPackAtPath$ = (path) => (
  Observable.defer(() => createPackAtPath(path))
    .map(pack => ({ pack }))
    .catch(error => [{ error }])
);
