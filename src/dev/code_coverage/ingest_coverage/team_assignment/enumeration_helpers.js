/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
