import { readFileSync } from 'fs';
import * as Rx from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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
  Rx.defer(() => createPackageJsonAtPath(path)).pipe(
    map(packageJson => ({ packageJson })),
    catchError(error => [{ error }])
  )
);
