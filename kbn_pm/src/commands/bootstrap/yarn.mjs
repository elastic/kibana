/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '../../lib/paths.mjs';
import { maybeRealpath, isFile, isDirectory } from '../../lib/fs.mjs';

// yarn integrity file checker
export async function removeYarnIntegrityFileIfExists() {
  try {
    const nodeModulesRealPath = await maybeRealpath(Path.resolve(REPO_ROOT, 'node_modules'));
    const yarnIntegrityFilePath = Path.resolve(nodeModulesRealPath, '.yarn-integrity');

    // check if the file exists and delete it in that case
    if (await isFile(yarnIntegrityFilePath)) {
      await Fsp.unlink(yarnIntegrityFilePath);
    }
  } catch {
    // no-op
  }
}

// yarn and bazel integration checkers
async function areNodeModulesPresent() {
  return await isDirectory(Path.resolve(REPO_ROOT, 'node_modules'));
}

async function haveBazelFoldersBeenCreatedBefore() {
  return (
    (await isDirectory(Path.resolve(REPO_ROOT, 'bazel-bin/packages'))) ||
    (await isDirectory(Path.resolve(REPO_ROOT, 'bazel-kibana/packages'))) ||
    (await isDirectory(Path.resolve(REPO_ROOT, 'bazel-out/host')))
  );
}

export async function haveNodeModulesBeenManuallyDeleted() {
  return !(await areNodeModulesPresent()) && (await haveBazelFoldersBeenCreatedBefore());
}
