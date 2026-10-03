/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

const NPM_PACKAGE_PATH = 'src/platform/packages/private/kbn-ui-shared-deps-npm';
const SRC_PACKAGE_PATH = 'src/platform/packages/private/kbn-ui-shared-deps-src';
const MONACO_PACKAGE_PATH = 'src/platform/packages/shared/kbn-monaco';

export interface SharedAssetPaths {
  npmPackageRoot: string;
  npmOutput: string;
  npmManifest: string;
  srcPackageRoot: string;
  srcOutput: string;
  monacoPackageRoot: string;
  monacoOutput: string;
}

export function resolveSharedAssetPaths(
  repoRoot: string,
  outputRoot: string = repoRoot
): SharedAssetPaths {
  const packageRoot =
    Path.resolve(outputRoot) === Path.resolve(repoRoot)
      ? Path.resolve(repoRoot, 'target/build')
      : outputRoot;
  const npmPackageRoot = Path.resolve(repoRoot, NPM_PACKAGE_PATH);
  const srcPackageRoot = Path.resolve(repoRoot, SRC_PACKAGE_PATH);
  const monacoPackageRoot = Path.resolve(repoRoot, MONACO_PACKAGE_PATH);
  const npmOutput = Path.resolve(packageRoot, NPM_PACKAGE_PATH, 'shared_built_assets');

  return {
    npmPackageRoot,
    npmOutput,
    npmManifest: Path.resolve(npmOutput, 'kbn-ui-shared-deps-npm-manifest.json'),
    srcPackageRoot,
    srcOutput: Path.resolve(packageRoot, SRC_PACKAGE_PATH, 'shared_built_assets'),
    monacoPackageRoot,
    monacoOutput: Path.resolve(packageRoot, MONACO_PACKAGE_PATH, 'target_workers'),
  };
}
