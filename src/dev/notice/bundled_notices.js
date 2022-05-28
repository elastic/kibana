/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { promisify } from 'util';

import glob from 'glob';

const globAsync = promisify(glob);

export async function getBundledNotices(packageDirectory) {
  const pattern = resolve(packageDirectory, '*{LICENSE,NOTICE}*');
  const paths = await globAsync(pattern);
  return Promise.all(
    paths.map(async (path) => ({
      path,
      text: await readFile(path, 'utf8'),
    }))
  );
}
