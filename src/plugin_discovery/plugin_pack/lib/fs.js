import { stat, readdir } from 'fs';
import { resolve } from 'path';

import { fromNode as fcb } from 'bluebird';

import { $fcb, $fromPromise } from '../../utils';
import { createInvalidDirectoryError } from '../../errors';

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
 *  Determine if a path currently points to a file
 *  @param  {String} path
 *  @return {Promise<boolean>}
 */
export async function isFile(path) {
  return await statTest(path, stat => stat.isFile());
}

/**
 *  Determine if a path currently points to a directory
 *  @param  {String} path
 *  @return {Promise<boolean>}
 */
export async function isDirectory(path) {
  return await statTest(path, stat => stat.isDirectory());
}

/**
 *  Get absolute paths for child directories within a path
 *  @param  {string} path
 *  @return {Promise<Array<string>>}
 */
export const createChildDirectory$ = (path) => (
  $fcb(cb => readdir(path, cb))
    .catch(error => {
      throw createInvalidDirectoryError(error, path);
    })
    .mergeAll()
    .filter(name => !name.startsWith('.'))
    .map(name => resolve(path, name))
    .mergeMap(v => (
      $fromPromise(isDirectory(path))
        .mergeMap(pass => pass ? [v] : [])
    ))
);
