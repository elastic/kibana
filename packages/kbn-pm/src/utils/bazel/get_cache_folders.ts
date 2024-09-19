/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dirname, resolve } from 'path';
import { spawn } from '../child_process';

async function rawRunBazelInfoRepoCache() {
  const { stdout: bazelRepositoryCachePath } = await spawn('bazel', ['info', 'repository_cache'], {
    stdio: 'pipe',
  });
  return bazelRepositoryCachePath;
}

export async function getBazelDiskCacheFolder() {
  return resolve(dirname(await rawRunBazelInfoRepoCache()), 'disk-cache');
}

export async function getBazelRepositoryCacheFolder() {
  return await rawRunBazelInfoRepoCache();
}
