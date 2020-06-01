/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { stat, readdir } from 'fs';
import { resolve, isAbsolute } from 'path';

import { fromNode as fcb } from 'bluebird';
import * as Rx from 'rxjs';
import { catchError, mergeAll, filter, map, mergeMap } from 'rxjs/operators';

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
    const stats = await fcb((cb) => stat(path, cb));
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
  return await statTest(path, (stat) => stat.isDirectory());
}

/**
 *  Get absolute paths for child directories within a path
 *  @param  {string} path
 *  @return {Promise<Array<string>>}
 */
export const createChildDirectory$ = (path) =>
  Rx.defer(() => {
    assertAbsolutePath(path);
    return fcb((cb) => readdir(path, cb));
  }).pipe(
    catchError((error) => {
      throw createInvalidDirectoryError(error, path);
    }),
    mergeAll(),
    filter((name) => !name.startsWith('.')),
    map((name) => resolve(path, name)),
    mergeMap(async (absolute) => {
      if (await isDirectory(absolute)) {
        return [absolute];
      } else {
        return [];
      }
    }),
    mergeAll()
  );
