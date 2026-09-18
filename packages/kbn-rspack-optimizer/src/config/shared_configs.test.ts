/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import { createMonacoWorkersConfig, MONACO_WORKERS_COMPILER } from './create_monaco_workers_config';
import { createMultiCompileConfig, KIBANA_COMPILER } from './create_multi_compile_config';
import { createSharedNpmConfig, SHARED_NPM_COMPILER } from './create_shared_npm_config';
import { createSharedSrcConfig, SHARED_SRC_COMPILER } from './create_shared_src_config';
import { resolveSharedAssetPaths } from './shared_asset_paths';

describe('shared Rspack configs', () => {
  const repoRoot = REPO_ROOT;
  const outputRoot = Path.resolve(repoRoot, 'target/test-rspack-shared-configs');

  afterAll(() => {
    Fs.rmSync(outputRoot, { recursive: true, force: true });
  });

  it('uses isolated package outputs and a manifest path dependency', () => {
    const paths = resolveSharedAssetPaths(repoRoot, outputRoot);
    const npm = createSharedNpmConfig({ repoRoot, outputRoot });
    const src = createSharedSrcConfig({ repoRoot, outputRoot });
    const monaco = createMonacoWorkersConfig({ repoRoot, outputRoot });

    expect({
      npm: { name: npm.name, output: npm.output?.path },
      src: { name: src.name, dependencies: src.dependencies, output: src.output?.path },
      monaco: { name: monaco.name, output: monaco.output?.path },
    }).toEqual({
      npm: { name: SHARED_NPM_COMPILER, output: paths.npmOutput },
      src: {
        name: SHARED_SRC_COMPILER,
        dependencies: [SHARED_NPM_COMPILER],
        output: paths.srcOutput,
      },
      monaco: { name: MONACO_WORKERS_COMPILER, output: paths.monacoOutput },
    });
  });

  it('keeps existing dev output locations', () => {
    const paths = resolveSharedAssetPaths(repoRoot);

    expect(paths.npmOutput).toBe(
      Path.resolve(
        repoRoot,
        'target/build/src/platform/packages/private/kbn-ui-shared-deps-npm/shared_built_assets'
      )
    );
    expect(paths.srcOutput).toBe(
      Path.resolve(
        repoRoot,
        'target/build/src/platform/packages/private/kbn-ui-shared-deps-src/shared_built_assets'
      )
    );
    expect(paths.monacoOutput).toBe(
      Path.resolve(repoRoot, 'target/build/src/platform/packages/shared/kbn-monaco/target_workers')
    );
  });

  it('creates an ordered four-compiler graph', async () => {
    const configs = await createMultiCompileConfig({ repoRoot, outputRoot });

    expect(
      configs.map(({ name, dependencies }) => ({
        name,
        dependencies,
      }))
    ).toEqual([
      { name: SHARED_NPM_COMPILER, dependencies: undefined },
      { name: MONACO_WORKERS_COMPILER, dependencies: undefined },
      { name: SHARED_SRC_COMPILER, dependencies: [SHARED_NPM_COMPILER] },
      {
        name: KIBANA_COMPILER,
        dependencies: [SHARED_SRC_COMPILER, MONACO_WORKERS_COMPILER],
      },
    ]);
  });
});
