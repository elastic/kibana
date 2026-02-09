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
import type { UserConfig, PluginOption, Plugin } from 'vite';
import { generateKbnAliases } from './kbn_resolver_plugin.js';

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
      // Single combined build resolver — handles legacy imports, special
      // modules, and misc edge cases in ONE plugin hook instead of 3-4
      // separate plugins. This minimises Rust→JS boundary crossings.
      //
      // @kbn/* package resolution is NOT in this plugin — it's handled
      // entirely by resolve.alias (Rolldown native, zero JS overhead).
      kbnBuildResolverPlugin({ repoRoot }),
      // User-provided plugins
      ...plugins,
    ],

    // Build configuration
    build: {
      outDir: Path.resolve(packageRoot, outDir),
      // Explicitly allow cleaning the outDir even when it's outside root.
      // During `yarn build` the outDir points into build/kibana/… which is
      // outside the plugin's source root. Without this Vite prints a noisy
      // "(!) outDir is not inside project root" warning for every plugin.
      emptyOutDir: true,
      sourcemap: !isProduction,
      minify: isProduction ? 'oxc' : false,
      target: isBrowser ? 'es2020' : 'node18',

      // Rollup/Rolldown options
      rolldownOptions: {
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
        // Tell Rolldown that .js files may contain JSX syntax.
        // Many Kibana plugins use JSX in plain .js files (not .jsx).
        // Without this, Rolldown's OXC parser rejects JSX in .js files.
        moduleTypes: {
          '.js': 'jsx',
        },
        // Some npm packages (e.g. @elastic/ems-client) have barrel files
        // that re-export TypeScript types which were erased during
        // compilation. The compiled .js files don't contain those exports.
        // Webpack silently treated missing exports as `undefined`; Rolldown
        // is strict and errors by default. This option creates `undefined`
        // shims for missing exports, matching webpack's behaviour.
        shimMissingExports: true,
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

    // OXC transform options (Vite 8 uses OXC instead of esbuild for transforms).
    // Note: JSX runtime is intentionally left to the OXC default / tsconfig.
    // The root tsconfig.base.json has "jsx": "react" (classic runtime), so
    // OXC will use React.createElement(). Do NOT set `importSource` here as
    // it conflicts with the classic runtime.
    //
    // Note: Do NOT set `esbuild: false` — Vite 8 has removed the esbuild
    // transpile path entirely and setting it to false just triggers a warning.
    oxc: {},

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

/**
 * Combined build resolver plugin — merges legacy-imports, special-modules,
 * and other edge-case resolution into a SINGLE synchronous resolveId hook.
 *
 * Why one plugin instead of three?
 * Each JS plugin hook means a Rust→JS→Rust boundary crossing in Rolldown.
 * With thousands of imports per plugin build, 3 separate plugins = 3x the
 * crossing overhead. A single plugin with a fast early-return for the
 * common case (non-matching imports) cuts this to 1x.
 *
 * Note: @kbn/* package resolution is handled by resolve.alias (Rolldown
 * native), NOT by this plugin. This plugin only handles:
 * - Legacy paths: kibana/public, kibana/server, src/*, x-pack/*
 * - Special modules: @modelcontextprotocol/sdk, zod, vega-lite, vega-tooltip
 * - @elastic/eui rewrites
 */
function kbnBuildResolverPlugin(options: { repoRoot: string }): Plugin {
  const { repoRoot } = options;

  // Pre-resolve special module paths once
  const SPECIAL_MODULES: Array<{
    test: (source: string) => boolean;
    resolve: (source: string) => string | null;
  }> = [
    // @modelcontextprotocol/sdk → dist/esm
    {
      test: (s) => s.startsWith('@modelcontextprotocol/sdk'),
      resolve: (s) => {
        const relPath = s.split('@modelcontextprotocol/sdk')[1] || '';
        const target = Path.resolve(
          repoRoot,
          `node_modules/@modelcontextprotocol/sdk/dist/esm${relPath}`
        );
        return resolveFileDirect(target);
      },
    },
    // @elastic/eui → optimize/es (build uses optimized bundle, not test-env)
    // Note: the dev server uses test-env via kbnSpecialModulesPlugin; for
    // build the alias in createKbnViteConfig already handles the base case.
    // This handles deep subpath imports.
    {
      test: (s) => s.startsWith('@elastic/eui/lib/'),
      resolve: (s) => {
        const subPath = s.replace('@elastic/eui/lib/', '');
        return resolveFileDirect(
          Path.resolve(repoRoot, `node_modules/@elastic/eui/optimize/es/${subPath}`)
        );
      },
    },
    // zod v3/v4
    {
      test: (s) => s === 'zod' || s.startsWith('zod/'),
      resolve: (s) => {
        if (s.startsWith('zod/v4')) {
          return Path.resolve(repoRoot, 'node_modules/zod/v4/index.cjs');
        }
        return Path.resolve(repoRoot, 'node_modules/zod/v3/index.cjs');
      },
    },
    // vega-lite → build
    {
      test: (s) => s.startsWith('vega-lite'),
      resolve: (s) => resolveFileDirect(Path.resolve(repoRoot, 'node_modules/vega-lite/build')),
    },
    // vega-tooltip → build
    {
      test: (s) => s.startsWith('vega-tooltip'),
      resolve: (s) => resolveFileDirect(Path.resolve(repoRoot, 'node_modules/vega-tooltip/build')),
    },
  ];

  return {
    name: 'kbn-build-resolver',

    resolveId: {
      order: 'pre',
      handler(source) {
        // ---- Fast path: skip relative/absolute/virtual imports ----
        // These make up 60-80% of all imports and can be rejected immediately.
        const c = source.charCodeAt(0);
        // '.' = 46, '/' = 47, '\0' = 0  (virtual modules)
        if (c === 46 || c === 47 || c === 0) {
          return null;
        }

        // ---- Legacy root-relative imports ----
        if (
          source.startsWith('src/') ||
          source.startsWith('x-pack/') ||
          source.startsWith('examples/') ||
          source.startsWith('test/')
        ) {
          return resolveFileDirect(Path.resolve(repoRoot, source));
        }

        // ---- Legacy kibana/* imports ----
        if (source === 'kibana/public') {
          return resolveFileDirect(Path.resolve(repoRoot, 'src/core/public'));
        }
        if (source === 'kibana/server') {
          return resolveFileDirect(Path.resolve(repoRoot, 'src/core/server'));
        }

        // ---- Special modules ----
        for (const mod of SPECIAL_MODULES) {
          if (mod.test(source)) {
            const resolved = mod.resolve(source);
            return resolved ? { id: resolved } : null;
          }
        }

        return null;
      },
    },
  };
}

const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

/** Resolve a path to a file, trying extensions and index files. Synchronous. */
function resolveFileDirect(targetPath: string): string | null {
  try {
    if (Fs.statSync(targetPath).isFile()) return targetPath;
  } catch {
    // not a file
  }
  for (const ext of EXTS) {
    try {
      if (Fs.statSync(targetPath + ext).isFile()) return targetPath + ext;
    } catch {
      // continue
    }
  }
  for (const ext of EXTS) {
    const idx = Path.join(targetPath, `index${ext}`);
    try {
      if (Fs.statSync(idx).isFile()) return idx;
    } catch {
      // continue
    }
  }
  return null;
}
