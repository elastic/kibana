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

/**
 * All supported worker languages.
 * Each language produces its own self-contained worker bundle.
 */
export const WORKER_LANGUAGES = [
  'default',
  'json',
  'xjson',
  'painless',
  'yaml',
  'console',
] as const;

function getWorkerEntry(language: string): string {
  switch (language) {
    case 'default':
      return require.resolve('monaco-editor/esm/vs/editor/editor.worker.js');
    case 'json':
      return require.resolve('monaco-editor/esm/vs/language/json/json.worker.js');
    default:
      return Path.resolve(
        __dirname,
        'src',
        'languages',
        language,
        'worker',
        `${language}.worker.ts`
      );
  }
}

/**
 * Vite/Rolldown build config for @kbn/monaco workers.
 *
 * Builds web workers for Monaco Editor language support.
 * Each worker is built as a self-contained IIFE (no imports) because
 * Kibana loads workers via classic `new Worker(url)`, not ES module workers.
 *
 * Set WORKER_LANG env var to build a specific language, or leave unset
 * to build all languages sequentially.
 */
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const lang = process.env.WORKER_LANG || 'default';

  return {
    clearScreen: false,
    root: __dirname,

    build: {
      lib: {
        entry: getWorkerEntry(lang),
        formats: ['iife'],
        name: `MonacoWorker_${lang}`,
        fileName: () => `${lang}.editor.worker.js`,
      },

      outDir: Path.resolve(process.env.OUTPUT_PATH || Path.resolve(__dirname, 'target_workers')),
      minify: isProd ? 'terser' : false,
      sourcemap: isProd ? false : 'hidden',
      // Don't empty outDir — we build workers one at a time
      emptyOutDir: false,

      rolldownOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },

    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
      alias: {
        // Swap default UMD import for the ESM one
        'vscode-uri$': require.resolve('vscode-uri').replace(/\/umd\/index.js/, '/esm/index.mjs'),
      },
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
    },

    logLevel: 'warn',
  };
});
