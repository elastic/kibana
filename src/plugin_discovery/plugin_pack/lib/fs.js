import { stat, readdir } from 'fs';
import { resolve, isAbsolute } from 'path';

import { fromNode as fcb } from 'bluebird';
import { Observable } from 'rxjs';

import { createInvalidDirectoryError } from '../../errors';

function assertAbsolutePath(path) {
  if (typeof path !== 'string') {
    throw createInvalidDirectoryError(new TypeError('path must be a string'), path);
  }

  if (!isAbsolute(path)) {
    throw createInvalidDirectoryError(new TypeError('path must be absolute'), path);
  }
}

async function statTest(path, test) {
  try {
    const stats = await fcb(cb => stat(path, cb));
    return Boolean(test(stats));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  return false;
}

/**
 *  Determine if a path currently points to a directory
 *  @param  {String} path
 *  @return {Promise<boolean>}
 */
export async function isDirectory(path) {
  assertAbsolutePath(path);
  return await statTest(path, stat => stat.isDirectory());
}

/**
 *  Get absolute paths for child directories within a path
 *  @param  {string} path
 *  @return {Promise<Array<string>>}
 */
export const createChildDirectory$ = (path) => (
  Observable
    .defer(() => {
      assertAbsolutePath(path);
      return fcb(cb => readdir(path, cb));
    })
    .catch(error => {
      throw createInvalidDirectoryError(error, path);
    })
    .mergeAll()
    .filter(name => !name.startsWith('.'))
    .map(name => resolve(path, name))
    .mergeMap(v => (
      Observable
        .fromPromise(isDirectory(path))
        .mergeMap(pass => pass ? [v] : [])
    ))
);
