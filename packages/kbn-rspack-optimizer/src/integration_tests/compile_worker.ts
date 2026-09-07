/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Compile worker for the rspack compile integration tests.
 *
 * Runs a real compilation in a clean Node process (loaded via
 * `@kbn/swc-register/install`, not Jest). This is required because
 * `@rspack/core` is pure ESM and must be loaded natively (see
 * rspack_runtime.ts); under Jest it lands in a different vm realm than the
 * test file, and Rspack's config normalization uses `instanceof RegExp`
 * checks that fail for cross-realm RegExp objects (rule `test`/`include`/
 * `exclude` conditions, externals, ignoreWarnings...), silently miscompiling.
 *
 * Usage: node -r @kbn/swc-register/install compile_worker.ts '<json options>'
 *
 * Contract: the process ALWAYS exits 0 once it has written
 * `<outputDir>/.compile-result.json` — compile errors are data, not process
 * failures (the test asserts on the result file contents). A non-zero exit
 * means the result file could not even be written (infra failure).
 */

import Path from 'path';
import Fs from 'fs';
import { createExternalPluginConfig } from '../config/create_external_plugin_config';
import { rspack } from '../rspack_runtime';

export const COMPILE_RESULT_FILENAME = '.compile-result.json';

export interface CompileWorkerOptions {
  repoRoot: string;
  pluginDir: string;
  pluginId: string;
  outputDir: string;
  dist: boolean;
}

export interface CompileWorkerResult {
  success: boolean;
  errors: string[];
}

async function compilePlugin(options: CompileWorkerOptions): Promise<CompileWorkerResult> {
  const config = await createExternalPluginConfig({
    repoRoot: options.repoRoot,
    pluginDir: options.pluginDir,
    pluginId: options.pluginId,
    outputDir: options.outputDir,
    dist: options.dist,
    watch: false,
    cache: false,
  });

  const compiler = rspack(config);
  const { promise, resolve, reject } = Promise.withResolvers<{
    hasErrors: boolean;
    errors: string[];
  }>();

  compiler.run((err, stats) => {
    compiler.close(() => {
      if (err) {
        reject(err);
        return;
      }
      const info = stats?.toJson({ all: false, errors: true });
      resolve({
        hasErrors: stats?.hasErrors() ?? true,
        errors: info?.errors?.map((e) => e.message) ?? [],
      });
    });
  });

  const { hasErrors, errors } = await promise;
  return { success: !hasErrors, errors };
}

/* eslint-disable no-console */
if (require.main === module) {
  const options = JSON.parse(process.argv[2]) as CompileWorkerOptions;
  const resultPath = Path.join(options.outputDir, COMPILE_RESULT_FILENAME);

  compilePlugin(options)
    .then((result) => {
      Fs.mkdirSync(options.outputDir, { recursive: true });
      Fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      // Unexpected failure (config creation, compiler crash, ...): still
      // report through the result file so the test can show the error, but
      // exit non-zero so a missing/corrupt file surfaces as a harness error.
      try {
        Fs.mkdirSync(options.outputDir, { recursive: true });
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
