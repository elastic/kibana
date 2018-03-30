import { Observable } from 'rxjs';
import { resolve } from 'path';
import { createInvalidPackError } from '../errors';

import { isDirectory } from './lib';

async function createPackageJsonAtPath(path) {
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

  return {
    directoryPath: path,
    contents: pkg,
  };
}

export const createPackageJsonAtPath$ = (path) => (
  Observable.defer(() => createPackageJsonAtPath(path))
    .map(packageJson => ({ packageJson }))
    .catch(error => [{ error }])
);
