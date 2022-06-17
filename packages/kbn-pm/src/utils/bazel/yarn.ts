/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join, resolve } from 'path';
import { isFile, tryRealpath, unlink } from '../fs';

// yarn integrity file checker
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

// yarn and bazel integration checkers
async function areNodeModulesPresent(kbnRootPath: string) {
  try {
    await tryRealpath(resolve(kbnRootPath, 'node_modules'));

    return true;
  } catch {
    return false;
  }
}

async function haveBazelBinPackagesBeenBuiltBefore(kbnRootPath: string) {
  try {
    await tryRealpath(resolve(kbnRootPath, 'bazel-bin', 'packages'));

    return true;
  } catch {
    return false;
  }
}

export async function haveNodeModulesBeenManuallyDeleted(kbnRootPath: string) {
  return (
    !(await areNodeModulesPresent(kbnRootPath)) &&
    (await haveBazelBinPackagesBeenBuiltBefore(kbnRootPath))
  );
}
