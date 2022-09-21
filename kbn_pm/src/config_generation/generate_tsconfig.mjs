/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '../lib/paths.mjs';
import { asyncMapWithLimit } from '../lib/async.mjs';

const BASE_TSCONFIG = Path.resolve(REPO_ROOT, 'tsconfig.bazel.json');

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
const obj = (v) =>
  typeof v === 'object' && v !== null ? /** @type {Record<string, unknown>} */ (v) : {};

/**
 * @param {Record<string, unknown>} v
 */
const shrink = (v) => Object.fromEntries(Object.entries(v).filter(([, v]) => v != null));

/**
 * @param {import('@kbn/bazel-packages').KibanaPackageManifest} manifest
 * @param {string} normalizedRepoRelativePkgDir
 */
export function getTsconfig(manifest, normalizedRepoRelativePkgDir) {
  const opts = obj(manifest.__deprecated__TalkToOperationsIfYouThinkYouNeedThis);
  const { browser } = obj(opts?.pkgJsonOverrides);

  return {
    extends: Path.relative(Path.resolve(REPO_ROOT, normalizedRepoRelativePkgDir), BASE_TSCONFIG),
    compilerOptions: shrink({
      rootDir: '.',
      outDir: './target_types',
      types: !!browser ? ['node', 'jest', 'react'] : ['node', 'jest'],
      ...obj(opts.tsCompOptsOverrides),
    }),
    include: opts.tsInclude ?? ['**/*.ts', !!browser ? '**/*.tsx' : []].flat(),
    exclude: opts.tsExclude ?? [],
  };
}

/**
 * @param {import('@kbn/bazel-packages').BazelPackage[]} pkgs
 */
export async function generateTsconfigs(pkgs) {
  await asyncMapWithLimit(pkgs, 50, async (pkg) => {
    if (pkg.manifest.__deprecated__TalkToOperationsIfYouThinkYouNeedThis?.noTsConfig) {
      return;
    }

    const pkgJson = getTsconfig(pkg.manifest, pkg.normalizedRepoRelativeDir);
    const path = Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir, 'tsconfig.json');
    await Fsp.writeFile(path, JSON.stringify(pkgJson, null, 2));
  });
}
