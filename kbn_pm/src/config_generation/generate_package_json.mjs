/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { isObj } from '../lib/obj_helpers.mjs';
import { REPO_ROOT } from '../lib/paths.mjs';
import { asyncMapWithLimit } from '../lib/async.mjs';

/**
 * @param {import('@kbn/bazel-packages').KibanaPackageManifest} manifest
 * @param {string} normalizedRepoRelativePkgDir
 */
export function getPackageJson(manifest, normalizedRepoRelativePkgDir) {
  return {
    name: manifest.id,
    license: normalizedRepoRelativePkgDir.startsWith('x-pack/')
      ? 'Elastic License 2.0'
      : 'SSPL-1.0 OR Elastic License 2.0',
    version: '0.0.0',
    private: true,
    main: './target_node/index.js',
    ...(isObj(manifest.__deprecated__TalkToOperationsIfYouThinkYouNeedThis?.pkgJsonOverrides)
      ? manifest.__deprecated__TalkToOperationsIfYouThinkYouNeedThis?.pkgJsonOverrides
      : {}),
  };
}

/**
 * @param {import('@kbn/bazel-packages').BazelPackage[]} pkgs
 */
export async function generatePackageJsons(pkgs) {
  await asyncMapWithLimit(pkgs, 50, async (pkg) => {
    const pkgJson = getPackageJson(pkg.manifest, pkg.normalizedRepoRelativeDir);
    const path = Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir, 'package.json');
    await Fsp.writeFile(path, JSON.stringify(pkgJson, null, 2));
  });
}
