/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import webpack from 'webpack';

// webpack.config.js is a plain CJS module that exports a factory function.
// We import it via require() since it has no type declarations; the return
// value is cast to webpack's Configuration type.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const buildWebpackConfig = require('./webpack.config') as (
  outputPath: string
) => webpack.Configuration;

// Bundle lives in the package's target/ directory — gitignored by the root
// .gitignore rule and shared across all runs regardless of --output-dir.
const BUNDLE_DIR = path.resolve(__dirname, '..', 'target', 'webpack_bundle');

/**
 * Builds the standalone browser bundle via webpack's Node API.
 * Output is always written to `target/webpack_bundle/bundle.js` inside
 * this package so it is covered by the repo-wide `.gitignore` for `target/`.
 *
 * @returns  Absolute path to the emitted `bundle.js`.
 */
export const buildBrowserBundle = (): Promise<string> => {
  const bundleDir = BUNDLE_DIR;
  const config = buildWebpackConfig(bundleDir);

  return new Promise((resolve, reject) => {
    const compiler = webpack(config);
    compiler.run((err, stats) => {
      // Hard errors (e.g. can't resolve entry)
      if (err) {
        reject(new Error(`webpack hard error: ${err.message}`));
        return;
      }

      if (!stats) {
        reject(new Error('webpack returned no stats'));
        return;
      }

      // Compilation errors (e.g. TypeScript type mismatches, import not found)
      if (stats.hasErrors()) {
        const info = stats.toJson({ errors: true, warnings: false });
        const messages = (info.errors ?? [])
          .map((e) => ('message' in e ? (e as { message: string }).message : String(e)))
          .join('\n\n');
        reject(new Error(`webpack compilation errors:\n\n${messages}`));
        return;
      }

      compiler.close((closeErr) => {
        if (closeErr) {
          reject(new Error(`webpack compiler close error: ${closeErr.message}`));
          return;
        }
        resolve(path.join(BUNDLE_DIR, 'bundle.js'));
      });
    });
  });
};
