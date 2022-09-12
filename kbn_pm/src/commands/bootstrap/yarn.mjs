/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '../../lib/paths.mjs';
import { maybeRealpath, isFile, isDirectory } from '../../lib/fs.mjs';

// yarn integrity file checker
export async function removeYarnIntegrityFileIfExists() {
  try {
    const nodeModulesRealPath = maybeRealpath(Path.resolve(REPO_ROOT, 'node_modules'));
    const yarnIntegrityFilePath = Path.resolve(nodeModulesRealPath, '.yarn-integrity');

    // check if the file exists and delete it in that case
    if (isFile(yarnIntegrityFilePath)) {
      await Fsp.unlink(yarnIntegrityFilePath);
    }
  } catch {
    // no-op
  }
}

// yarn and bazel integration checkers
function areNodeModulesPresent() {
  try {
    return isDirectory(Path.resolve(REPO_ROOT, 'node_modules'));
  } catch {
    return false;
  }
}

function haveBazelFoldersBeenCreatedBefore() {
  try {
    return (
      isDirectory(Path.resolve(REPO_ROOT, 'bazel-bin/packages')) ||
      isDirectory(Path.resolve(REPO_ROOT, 'bazel-kibana/packages')) ||
      isDirectory(Path.resolve(REPO_ROOT, 'bazel-out/host'))
    );
  } catch {
    return false;
  }
}

export function haveNodeModulesBeenManuallyDeleted() {
  return !areNodeModulesPresent() && haveBazelFoldersBeenCreatedBefore();
}
