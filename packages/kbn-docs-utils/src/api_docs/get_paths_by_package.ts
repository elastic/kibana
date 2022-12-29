/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { getRepoFiles } from '@kbn/get-repo-files';
import { REPO_ROOT } from '@kbn/repo-info';

import { PluginOrPackage as Package } from './types';

export async function getPathsByPackage(packages: Package[]) {
  // prepopulate the cache with the location of each package
  const cache = new Map<string, Package | null>(
    packages.map((p) => [Path.relative(REPO_ROOT, p.directory), p])
  );

  /**
   * recursively find the package for a repo relative path by
   * checking the cache for existing values, then if there is no
   * value checking the parent directories recursively. When no
   * value is found in the cache for this repoRel or any of its
   * parents then null is returned.
   */
  function getPkg(repoRel: string): Package | null {
    const cached = cache.get(repoRel);
    if (cached !== undefined) {
      return cached;
    }

    const parent = Path.join(repoRel, '..');
    if (parent === '.' || parent === repoRel) {
      cache.set(repoRel, null);
      return null;
    }

    const pkg = getPkg(parent);
    cache.set(repoRel, pkg);
    return pkg;
  }

  const pathsByPackage = new Map<Package, string[]>();
  for (const file of await getRepoFiles()) {
    if (file.isFixture() || (!file.isJavaScript() && !file.isTypeScript())) {
      continue;
    }

    const path = file.abs;
    const pkg = getPkg(file.repoRel);
    if (pkg !== null) {
      const existing = pathsByPackage.get(pkg);
      if (existing) {
        existing.push(path);
      } else {
        pathsByPackage.set(pkg, [path]);
      }
    }
  }

  return pathsByPackage;
}
