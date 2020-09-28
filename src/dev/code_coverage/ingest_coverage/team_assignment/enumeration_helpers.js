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

import { statSync } from 'fs';
import isGlob from 'is-glob';
import glob from 'glob';
import { left, right, tryCatch } from '../either';

export const push = (xs) => (x) => xs.push(x);
export const pathExists = (x) => tryCatch(() => statSync(x)).fold(left, right);
export const isDir = (x) => statSync(x).isDirectory();
export const prokGlob = (x) => glob.sync(x, { nonull: true });
export const trim = (ROOT) => (x) => x.replace(`${ROOT}/`, '');
export const isFileAllowed = (x) => {
  const isJsOrTsOrTsxOrJsx = /.(j|t)(s|sx)$/gm;
  return isJsOrTsOrTsxOrJsx.test(x);
};
export const isRejectedDir = (x) =>
  /node_modules|__tests__|__fixture__|__fixtures__|build\//gm.test(x);
const isGlobFound = (x) => (xs) => (x === xs[0] ? false : true);
export const globExpands = (x) => isGlobFound(x)(prokGlob(x));
export const tryPath = (x) => {
  const isAGlob = isGlob(x);

  if (isAGlob) return globExpands(x) ? right(x) : left(x);

  if (!isAGlob) return pathExists(x).isRight() ? right(x) : left(x);
};
export const dropEmpty = (x) => x.length > 0;
export const notFound = (log) => (err) => log.error(`\n!!! Not Found: \n${err}`);
