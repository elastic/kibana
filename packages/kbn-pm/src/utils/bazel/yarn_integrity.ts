/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import { isFile, mkdirp, tryRealpath, writeFile } from '../fs';

export async function yarnIntegrityFileExists(nodeModulesPath: string) {
  try {
    const nodeModulesRealPath = await tryRealpath(nodeModulesPath);
    const yarnIntegrityFilePath = join(nodeModulesRealPath, '.yarn-integrity');

    // check if the file already exists
    if (await isFile(yarnIntegrityFilePath)) {
      return true;
    }
  } catch {
    // no-op
  }

  return false;
}

export async function ensureYarnIntegrityFileExists(nodeModulesPath: string) {
  try {
    const nodeModulesRealPath = await tryRealpath(nodeModulesPath);
    const yarnIntegrityFilePath = join(nodeModulesRealPath, '.yarn-integrity');

    // ensure node_modules folder is created
    await mkdirp(nodeModulesRealPath);

    // write a blank file in case it doesn't exists
    await writeFile(yarnIntegrityFilePath, '', { flag: 'wx' });
  } catch {
    // no-op
  }
}
