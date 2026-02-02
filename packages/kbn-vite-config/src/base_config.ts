/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { UserConfig, PluginOption } from 'vite';
import {
  kbnResolverPlugin,
  kbnLegacyImportsPlugin,
  kbnSpecialModulesPlugin,
  generateKbnAliases,
} from './kbn_resolver_plugin';

export interface KbnViteConfigOptions {
  /**
   * The root directory of the Kibana repository
   */
  repoRoot: string;

  /**
   * The root directory of the package being built
   */
  packageRoot: string;

  /**
   * Whether this is a production build
   */
  isProduction?: boolean;

  /**
   * Whether this build is for the browser (vs Node.js)
   */
  isBrowser?: boolean;

  /**
   * Additional Vite plugins to include
   */
  plugins?: PluginOption[];

  /**
   * Additional resolve aliases
   */
  aliases?: Record<string, string>;

  /**
   * Entry points for the build
   */
  entry?: string | string[] | Record<string, string>;

  /**
   * Output directory (relative to packageRoot)
   */
  outDir?: string;

  /**
   * External dependencies to exclude from bundling
   */
  external?: (string | RegExp)[];

  /**
   * Enable React support
   */
  react?: boolean;
}

/**
 * Creates a base Vite configuration for Kibana packages.
 * This configuration mirrors the webpack setup but uses Vite's architecture.
 */
export function createKbnViteConfig(options: KbnViteConfigOptions): UserConfig {
  const {
    repoRoot,
    packageRoot,
    isProduction = process.env.NODE_ENV === 'production',
    isBrowser = true,
    plugins = [],
    aliases = {},
    entry,
    outDir = 'target',
    external = [],
    react = true,
  } = options;

  // Generate aliases from the package map
  const kbnAliases = generateKbnAliases(repoRoot);

  // Merge with additional aliases
  const resolveAliases = {
    ...kbnAliases,
    ...aliases,
    // React profiling aliases (matching webpack config)
    ...(isBrowser && !isProduction
      ? {
          'react-dom': 'react-dom/profiling',
          'scheduler/tracing': 'scheduler/tracing-profiling',
        }
      : {}),
  };

  // Build the base config
  const config: UserConfig = {
    root: packageRoot,
    mode: isProduction ? 'production' : 'development',

    resolve: {
      alias: resolveAliases,
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      // Prefer browser field in package.json for browser builds
      mainFields: isBrowser ? ['browser', 'module', 'main'] : ['module', 'main'],
      conditions: isBrowser
        ? ['browser', 'module', 'import', 'default']
        : ['node', 'module', 'import', 'default'],
    },

    plugins: [
      // Kibana-specific resolver plugins
      kbnResolverPlugin({ repoRoot, additionalAliases: aliases }),
      kbnLegacyImportsPlugin({ repoRoot }),
      kbnSpecialModulesPlugin({ repoRoot }),
      // User-provided plugins
      ...plugins,
    ],

    // Build configuration
    build: {
      outDir: Path.resolve(packageRoot, outDir),
      sourcemap: !isProduction,
      minify: isProduction ? 'esbuild' : false,
      target: isBrowser ? 'es2020' : 'node18',

      // Rollup options
      rollupOptions: {
        external: [
          // Node.js built-ins for server builds
          ...(isBrowser ? [] : ['node:*', /^node:/]),
          // User-specified externals
          ...external,
        ],
        output: {
          // Preserve module structure for better debugging
          preserveModules: !isProduction,
          preserveModulesRoot: packageRoot,
        },
      },

      // Library mode for packages
      lib: entry
        ? {
            entry,
            formats: isBrowser ? ['es'] : ['es', 'cjs'],
            fileName: (format, name) => {
              const ext = format === 'cjs' ? 'cjs' : 'js';
              return `${name}.${ext}`;
            },
          }
        : undefined,
    },

    // esbuild options for TypeScript
    esbuild: {
      // Preserve names for better debugging and error messages
      keepNames: true,
      // Target modern browsers/Node
      target: isBrowser ? 'es2020' : 'node18',
      // Support JSX
      jsx: react ? 'automatic' : undefined,
      jsxImportSource: react ? 'react' : undefined,
    },

    // Optimize dependencies
    optimizeDeps: {
      // Include commonly used dependencies for faster dev server startup
      include: isBrowser
        ? ['react', 'react-dom', 'lodash', '@elastic/eui', '@emotion/react', '@emotion/styled']
        : [],
      // Exclude @kbn/* packages since they're local
      exclude: ['@kbn/*'],
    },

    // Define global constants
    define: {
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      ...(isProduction
        ? {
            'process.env.IS_KIBANA_DISTRIBUTABLE': JSON.stringify('true'),
          }
        : {}),
    },
  };

  return config;
}

/**
 * Creates a Vite configuration for browser/UI packages
 */
export function createKbnBrowserConfig(
  options: Omit<KbnViteConfigOptions, 'isBrowser'>
): UserConfig {
  return createKbnViteConfig({
    ...options,
    isBrowser: true,
  });
}

/**
 * Creates a Vite configuration for Node.js/server packages
 */
export function createKbnNodeConfig(options: Omit<KbnViteConfigOptions, 'isBrowser'>): UserConfig {
  return createKbnViteConfig({
    ...options,
    isBrowser: false,
    react: false,
  });
}
