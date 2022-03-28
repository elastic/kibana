/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import { isFile, tryRealpath, unlink } from '../fs';

export async function removeYarnIntegrityFileIfExists(nodeModulesPath: string) {
  try {
    const nodeModulesRealPath = await tryRealpath(nodeModulesPath);
    const yarnIntegrityFilePath = join(nodeModulesRealPath, '.yarn-integrity');

    // check if the file exists and delete it in that case
    if (await isFile(yarnIntegrityFilePath)) {
      await unlink(yarnIntegrityFilePath);
    }
  } catch {
    // no-op
  }
}

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
