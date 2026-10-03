/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Runs the real shared-bundle build outside Jest. `@rspack/core` is pure ESM
 * and Rspack's config normalization uses `instanceof RegExp`, which fails
 * across Jest's vm realm (see compile_worker.ts).
 *
 * Usage: node -r @kbn/swc-register/install shared_build_worker.ts '<json options>'
 */

import Path from 'path';
import Fs from 'fs';
import { runSharedBuild } from '../run_shared_build';

export const SHARED_BUILD_RESULT_FILENAME = '.shared-build-result.json';

export interface SharedBuildWorkerOptions {
  repoRoot: string;
  outputRoot: string;
}

export interface SharedBuildWorkerResult {
  success: boolean;
  errors: string[];
}

async function buildSharedBundles(
  options: SharedBuildWorkerOptions
): Promise<SharedBuildWorkerResult> {
  const result = await runSharedBuild({
    repoRoot: options.repoRoot,
    outputRoot: options.outputRoot,
    dist: false,
    watch: false,
  });

  return {
    success: result.success,
    errors: result.errors ?? [],
  };
}

/* eslint-disable no-console */
if (require.main === module) {
  const options = JSON.parse(process.argv[2]) as SharedBuildWorkerOptions;
  const resultPath = Path.join(options.outputRoot, SHARED_BUILD_RESULT_FILENAME);

  buildSharedBundles(options)
    .then((result) => {
      Fs.mkdirSync(options.outputRoot, { recursive: true });
      Fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      try {
        Fs.mkdirSync(options.outputRoot, { recursive: true });
        Fs.writeFileSync(
          resultPath,
          JSON.stringify({ success: false, errors: [err?.message ?? String(err)] }, null, 2)
        );
      } catch {
        // ignore secondary write errors
      }
      console.error(err);
      process.exit(1);
    });
}
