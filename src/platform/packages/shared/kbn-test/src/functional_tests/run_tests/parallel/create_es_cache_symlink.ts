/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const { promises: fs } = Fs;

export async function createEsCacheSymlink(namespace: string): Promise<void> {
  const cacheDir = Path.join(REPO_ROOT, '.es', 'cache');

  // Skip work if the shared cache directory is not present
  try {
    await fs.access(cacheDir);
  } catch {
    return;
  }

  const cacheNamespaceDir = Path.join(REPO_ROOT, '.es', namespace);
  const cacheSymlinkPath = Path.join(cacheNamespaceDir, 'cache');

  // Reuse the shared Elasticsearch cache when tests run in parallel namespaces
  await fs.mkdir(cacheNamespaceDir, { recursive: true });

  const existingEntry = await fs.lstat(cacheSymlinkPath).catch(() => undefined);

  if (existingEntry) {
    if (existingEntry.isSymbolicLink()) {
      const currentTarget = await fs.readlink(cacheSymlinkPath);
      if (currentTarget === cacheDir) {
        return;
      }
      await fs.unlink(cacheSymlinkPath);
    } else {
      await fs.rm(cacheSymlinkPath, { recursive: true, force: true });
    }
  }

  await fs.symlink(cacheDir, cacheSymlinkPath, 'dir');
}
