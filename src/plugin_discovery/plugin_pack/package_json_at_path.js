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
