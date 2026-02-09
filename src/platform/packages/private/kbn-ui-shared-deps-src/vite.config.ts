/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defineConfig, type Plugin, type PluginOption } from 'vite';
import Path from 'path';
import { kbnPeggyPlugin, kbnDotTextPlugin, kbnResolverPlugin } from '@kbn/vite-config';

const REPO_ROOT = Path.resolve(__dirname, '../../../../..');
const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');
const DOMPURIFY_SRC = require.resolve('dompurify/purify.js');

/**
 * Plugin to replace Monaco Editor's bundled DOMPurify with the project's version.
 * Equivalent to webpack's NormalModuleReplacementPlugin for DOMPurify.
 */
function dompurifyReplacementPlugin(): Plugin {
  const dompurifyRegex = /(\.\.\/)*(\.\/)?dompurify[/\\]dompurify\.js$/;
  return {
    name: 'kbn-dompurify-replacement',
    enforce: 'pre',
    resolveId(source, importer) {
      if (dompurifyRegex.test(source)) {
        return DOMPURIFY_SRC;
      }
      return null;
    },
  };
}

/**
 * Vite/Rolldown build config for @kbn/ui-shared-deps-src.
 *
 * This replaces the webpack build for @kbn/ui-shared-deps-src.
 * It bundles Kibana source dependencies into a single IIFE exposed
 * as `__kbnSharedDeps__` global.
 *
 * Uses existing plugins from @kbn/vite-config for .peggy and .text files.
 */
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    clearScreen: false,
    root: __dirname,

    plugins: [
      // Handle .peggy grammar files (Peggy parser generator)
      kbnPeggyPlugin() as PluginOption,
      // Handle .text raw text imports
      kbnDotTextPlugin() as PluginOption,
      // Kibana package resolution (@kbn/* → source paths)
      kbnResolverPlugin({ repoRoot: REPO_ROOT }) as PluginOption,
      // Replace Monaco's bundled DOMPurify with project version
      dompurifyReplacementPlugin(),
    ],

    build: {
      lib: {
        entry: Path.resolve(__dirname, 'src/entry.js'),
        name: '__kbnSharedDeps__',
        formats: ['iife'],
        fileName: () => 'kbn-ui-shared-deps-src.js',
      },

      outDir: Path.resolve(
        process.env.OUTPUT_PATH || Path.resolve(__dirname, 'shared_built_assets')
      ),
      minify: false,
      sourcemap: isProd ? false : 'hidden',
      emptyOutDir: true,
      cssCodeSplit: false,

      rolldownOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'kbn-ui-shared-deps-src.css';
            }
            return '[name].[ext]';
          },
          chunkFileNames: 'kbn-ui-shared-deps-src.chunk.[name].js',
          inlineDynamicImports: true,
        },
      },
    },

    resolve: {
      alias: {
        // Use optimized EUI build
        '@elastic/eui$': '@elastic/eui/optimize/es',
        '@elastic/eui/lib/components/provider/nested$':
          '@elastic/eui/optimize/es/components/provider/nested',
        '@elastic/eui/lib/services/theme/warning$':
          '@elastic/eui/optimize/es/services/theme/warning',
        // Use pre-built moment with all locales
        moment: MOMENT_SRC,
        // React profiling build
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
      },
      extensions: ['.js', '.ts', '.tsx', '.json'],
      mainFields: ['browser', 'module', 'main'],
      conditions: ['browser', 'module', 'import', 'require', 'default'],
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
    },

    logLevel: 'warn',
  };
});
