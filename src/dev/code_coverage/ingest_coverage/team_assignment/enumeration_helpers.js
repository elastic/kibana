/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { statSync } from 'fs';
import globby from 'globby';
import { left, right, tryCatch } from '../either';
import { taMark } from '../utils';

export const push = (xs) => (x) => xs.push(x);
export const pathExists = (x) => tryCatch(() => statSync(x)).fold(left, right);
export const isDir = (x) => statSync(x).isDirectory();
export const prokGlob = (x) => globby.sync(x);
export const trim = (ROOT) => (x) => x.replace(`${ROOT}/`, '');
export const isFileAllowed = (x) => /.(j|t)(s|sx)$/gm.test(x);
export const isRejectedDir = (x) =>
  /node_modules|__tests__|__fixture__|__fixtures__|build\//gm.test(x);
export const globExpands = (x) => Boolean(prokGlob(x).length);
export const tryPath = (x) => {
  const isAGlob = globby.hasMagic(x);

  if (isAGlob) return globExpands(x) ? right(x) : left(x);

  if (!isAGlob) return pathExists(x).isRight() ? right(x) : left(x);
};
export const notFound = (log) => (err) => log.error(`\n${taMark} Not Found: \n${err}`);
