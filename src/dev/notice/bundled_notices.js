/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
import { readFile } from 'fs';

import { fromNode as fcb } from 'bluebird';
import glob from 'glob';

export async function getBundledNotices(packageDirectory) {
  const pattern = resolve(packageDirectory, '*{LICENSE,NOTICE}*');
  const paths = await fcb((cb) => glob(pattern, cb));
  return Promise.all(
    paths.map(async (path) => ({
      path,
      text: await fcb((cb) => readFile(path, 'utf8', cb)),
    }))
  );
}
