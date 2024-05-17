/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import fs from 'fs/promises';
import globby from 'globby';

/**
 * Removes any files matching glob pattern from the target directory
 *
 * @param path target directory
 * @param globPattern files pattern to remove
 */
export async function removeFilesByGlob(path: string, globPattern: string): Promise<void> {
  const filesToRemove = await globby([resolve(path, globPattern)]);

  await Promise.all(filesToRemove.map((fileName) => fs.unlink(fileName)));
}
