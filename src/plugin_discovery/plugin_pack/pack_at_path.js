import { Observable } from 'rxjs';
import { isAbsolute, resolve } from 'path';
import { createInvalidPackError } from '../errors';

import { isDirectory, isFile } from './lib';
import { PluginPack } from './plugin_pack';

async function createPackAtPath(path) {
  if (!isAbsolute(path)) {
    throw createInvalidPackError(null, 'requires an absolute path');
  }

  if (!await isDirectory(path)) {
    throw createInvalidPackError(path, 'must be a directory');
  }

  const pkgPath = resolve(path, 'package.json');
  if (!await isFile(pkgPath)) {
    throw createInvalidPackError(path, 'must have a package.json file');
  }

  const pkg = require(pkgPath);
  if (!pkg || typeof pkg !== 'object') {
    throw createInvalidPackError(path, 'must have a value package.json file');
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
  Observable.from(createPackAtPath(path))
    .map(pack => ({ pack }))
    .catch(error => [{ error }])
);
