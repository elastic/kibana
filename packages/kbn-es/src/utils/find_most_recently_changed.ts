/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import fs from 'fs';
import glob from 'glob';

/**
 *  Find the most recently modified file that matches the pattern pattern
 */
export function findMostRecentlyChanged(pattern: string) {
  if (!path.isAbsolute(pattern)) {
    throw new TypeError(`Pattern must be absolute, got ${pattern}`);
  }

  const ctime = (p: string) => fs.statSync(p).ctime.getTime();

  return glob
    .sync(pattern)
    .sort((a, b) => ctime(a) - ctime(b))
    .pop();
}
