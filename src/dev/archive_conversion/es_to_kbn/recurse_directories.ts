/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import { join } from 'path';
import { flatten } from './utils';

export const getDirectories = (srcpath): unknown =>
  fs
    .readdirSync(srcpath)
    .map((file) => join(srcpath, file))
    .filter((path) => fs.statSync(path).isDirectory());
export const getDirectoriesRecursive = (srcpath): unknown => [
  srcpath,
  ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive)),
];
