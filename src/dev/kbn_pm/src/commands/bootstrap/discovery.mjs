/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import External from '../../lib/external_packages.js';
import { REPO_ROOT } from '../../lib/paths.mjs';

export async function discovery() {
  const { getRepoRels } = External['@kbn/repo-packages']();

  /** @type {string[]} */
  const tsConfigRepoRels = [];
  /** @type {string[]} */
  const packageManifestPaths = [];
  for (const repoRel of await getRepoRels(REPO_ROOT, [
    'tsconfig.json',
    '**/tsconfig.json',
    '**/kibana.jsonc',
  ])) {
    if (repoRel === 'tsconfig.json' || repoRel.endsWith('/tsconfig.json')) {
      tsConfigRepoRels.push(repoRel);
      continue;
    }

    if (repoRel.endsWith('/kibana.jsonc')) {
      packageManifestPaths.push(Path.resolve(REPO_ROOT, repoRel));
      continue;
    }

    throw new Error(`unexpected repo rel: ${repoRel}`);
  }

  return {
    tsConfigRepoRels,
    packageManifestPaths,
  };
}
