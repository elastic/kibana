/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defineConfig } from 'vite';
import Path from 'path';

const REPO_ROOT = Path.resolve(__dirname, '../../../../..');
const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');

/**
 * Vite/Rolldown build config for @kbn/ui-shared-deps-npm.
 *
 * Bundles all shared npm dependencies into a single IIFE exposed as
 * `__kbnSharedDeps_npm__`. This replaces the webpack DLL build.
 *
 * The npm bundle is loaded before the src bundle in the browser.
 * The src bundle (@kbn/ui-shared-deps-src) re-exports modules from
 * this bundle as `__kbnSharedDeps__.*` which plugins reference.
 */
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    clearScreen: false,
    root: __dirname,

    build: {
      lib: {
        // Entry: list of all npm modules to bundle
        entry: Path.resolve(__dirname, 'src/entry.js'),
        name: '__kbnSharedDeps_npm__',
        formats: ['iife'],
        fileName: () => 'kbn-ui-shared-deps-npm.dll.js',
      },

      outDir: Path.resolve(
        process.env.OUTPUT_PATH || Path.resolve(__dirname, 'shared_built_assets')
      ),
      minify: false,
      sourcemap: isProd ? false : 'hidden',
      emptyOutDir: true,
      cssCodeSplit: false,

      rolldownOptions: {
        // Externalize node built-in 'module'
        external: ['module'],
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'kbn-ui-shared-deps-npm.css';
            }
            return '[name].[ext]';
          },
          inlineDynamicImports: true,
        },
      },
    },

    resolve: {
      alias: {
        '@elastic/eui$': '@elastic/eui/optimize/es',
        moment: MOMENT_SRC,
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
        buffer: Path.resolve(REPO_ROOT, 'node_modules/node-stdlib-browser/node_modules/buffer'),
        punycode: Path.resolve(REPO_ROOT, 'node_modules/node-stdlib-browser/node_modules/punycode'),
      },
      extensions: ['.js', '.ts', '.json'],
      mainFields: ['browser', 'module', 'main'],
      conditions: ['browser', 'module', 'import', 'require', 'default'],
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
      // Polyfill process and global for browser
      'process.env': JSON.stringify({}),
      global: 'globalThis',
    },

    logLevel: 'warn',
  };
});
