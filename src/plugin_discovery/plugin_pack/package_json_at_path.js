import { readFileSync } from 'fs';
import { Observable } from 'rxjs';
import { resolve } from 'path';
import { createInvalidPackError } from '../errors';

import { isDirectory } from './lib';

async function createPackageJsonAtPath(path) {
  if (!await isDirectory(path)) {
    throw createInvalidPackError(path, 'must be a directory');
  }

  let str;
  try {
    str = readFileSync(resolve(path, 'package.json'));
  } catch (err) {
    throw createInvalidPackError(path, 'must have a package.json file');
  }

  let pkg;
  try {
    pkg = JSON.parse(str);
  } catch (err) {
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
