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
import { rspack, type Configuration } from '@rspack/core';
import { discoverPlugins, createCoreEntry } from '../utils/plugin_discovery';
import { createThemeRules } from './theme_rules';
import { getExternals } from './externals';
import type { PluginEntry, ThemeTag } from '../types';

export interface HybridPluginConfigOptions {
  /** Repository root path */
  repoRoot: string;
  /** Output root path */
  outputRoot?: string;
  /** Production build */
  dist?: boolean;
  /** Enable watch mode */
  watch?: boolean;
  /** Enable caching */
  cache?: boolean;
  /** Include example plugins */
  examples?: boolean;
  /** Include test plugins */
  testPlugins?: boolean;
  /** Theme tags to build */
  themeTags?: ThemeTag[];
  /**
   * Specific plugin IDs to build (isolated build).
   * If provided, only these plugins are built.
   * Shared container must exist from a prior full build.
   */
  plugins?: string[];
  /** Plugin IDs to exclude */
  filter?: string[];
}

/**
 * Create RSPack configurations for plugins using the hybrid approach:
 * - Shared deps are externalized (reference kbn-shared container)
 * - Plugins are MF remotes for cross-plugin imports
 * - Result: Tiny plugin bundles with ZERO dependency duplication
 *
 * @returns Array of configurations (one per plugin)
 */
export async function createHybridPluginConfigs(
  options: HybridPluginConfigOptions
): Promise<Configuration[]> {
  const {
    repoRoot,
    outputRoot = repoRoot,
    dist = false,
    watch = false,
    cache = true,
    examples = false,
    testPlugins = false,
    themeTags = ['borealislight', 'borealisdark'],
    plugins: targetPlugins,
    filter,
  } = options;

  const isIsolatedBuild = targetPlugins && targetPlugins.length > 0;

  // Discover plugins
  const allPlugins = discoverPlugins({
    repoRoot,
    outputRoot,
    examples,
    testPlugins,
    focus: targetPlugins,
    filter,
  });

  // Filter to plugins with valid entry points
  const plugins = allPlugins.filter((plugin) => {
    const entryPath = findEntry(plugin.contextDir);
    if (!entryPath) {
      if (!isIsolatedBuild) {
        // eslint-disable-next-line no-console
        console.log(`[rspack] Skipping ${plugin.id} - no public entry point`);
      }
      return false;
    }
    return true;
  });

  // Use externals from @kbn/ui-shared-deps (same as webpack optimizer)
  const externals = getExternals();

  const configs: Configuration[] = [];

  // For full builds, include core
  if (!isIsolatedBuild) {
    const coreEntry = createCoreEntry(repoRoot, outputRoot);
    const coreEntryPath = findEntry(coreEntry.contextDir);

    if (coreEntryPath) {
      configs.push(
        createPluginConfig({
          plugin: { ...coreEntry, id: 'core' },
          entryPath: coreEntryPath,
          isCore: true,
          externals,
          repoRoot,
          outputRoot,
          dist,
          watch,
          cache,
          themeTags,
        })
      );
    }
  }

  // Create config for each plugin
  for (const plugin of plugins) {
    const entryPath = findEntry(plugin.contextDir)!;

    configs.push(
      createPluginConfig({
        plugin,
        entryPath,
        isCore: false,
        externals,
        repoRoot,
        outputRoot,
        dist,
        watch,
        cache,
        themeTags,
      })
    );
  }

  // eslint-disable-next-line no-console
  console.log(`[rspack] Created ${configs.length} plugin configurations`);
  if (isIsolatedBuild) {
    // eslint-disable-next-line no-console
    console.log(`[rspack] Isolated build: ${targetPlugins!.join(', ')}`);
  }

  return configs;
}

interface PluginConfigParams {
  plugin: PluginEntry;
  entryPath: string;
  isCore: boolean;
  externals: Record<string, string>;
  repoRoot: string;
  outputRoot: string;
  dist: boolean;
  watch: boolean;
  cache: boolean;
  themeTags: ThemeTag[];
}

function createPluginConfig(params: PluginConfigParams): Configuration {
  const {
    plugin,
    entryPath,
    isCore,
    externals,
    repoRoot,
    outputRoot,
    dist,
    watch,
    cache,
    themeTags,
  } = params;

  // Output to the plugin's own target/public directory
  // This matches where Kibana expects to find the bundles
  const outputPath = plugin.outputDir;

  return {
    name: plugin.id,
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-module-source-map',
    target: 'web',
    context: plugin.contextDir,

    entry: {
      [`${plugin.id}.plugin`]: entryPath,
    },

    output: {
      path: outputPath,
      filename: '[name].js',
      chunkFilename: '[name].[contenthash:8].js',
      publicPath: 'auto',
      clean: true,
      // Use umd library type - creates a self-registering bundle
      library: {
        type: 'umd',
        name: isCore ? 'kibanaCore' : plugin.id.replace(/-/g, '_'),
      },
      globalObject: 'this',
    },

    // Externalize shared deps to __kbnSharedDeps__ globals
    externals,

    experiments: {
      css: true,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      mainFields: ['browser', 'module', 'main'],
      conditionNames: ['browser', 'module', 'import', 'require', 'default'],
      alias: {
        '@elastic/eui$': '@elastic/eui/optimize/es',
      },
      tsConfig: Path.resolve(repoRoot, 'tsconfig.base.json'),
      // Fallbacks for Node.js built-in modules (set to false = provide empty module)
      fallback: {
        // Core Node.js modules
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        assert: false,
        url: false,
        http: false,
        https: false,
        zlib: false,
        child_process: false,
        net: false,
        tls: false,
        dns: false,
        events: false,
        querystring: false,
        string_decoder: false,
        constants: false,
        process: false,
        vm: false,
        tty: false,
        timers: false,
        sax: false,
        // node: prefix variants
        'node:fs': false,
        'node:path': false,
        'node:os': false,
        'node:crypto': false,
        'node:stream': false,
        'node:buffer': false,
        'node:util': false,
        'node:url': false,
        'node:http': false,
        'node:https': false,
        'node:zlib': false,
        'node:child_process': false,
        'node:net': false,
        'node:tls': false,
        'node:dns': false,
        'node:events': false,
        'node:querystring': false,
        'node:process': false,
        'node:vm': false,
        'node:timers': false,
        // Packages that use Node modules
        xml2js: false,
        xmlbuilder: false,
        // Server-only Kibana packages (should not be bundled for browser)
        '@kbn/config-schema': false,
      },
    },

    module: {
      rules: [
        // TypeScript/JavaScript files
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
                decorators: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
              target: 'es2020',
            },
          },
        },
        // PEG.js grammar files - treat as pre-compiled source
        {
          test: /\.peggy$/,
          type: 'asset/source',
        },
        // Files with ?asUrl query - return URL as string
        {
          resourceQuery: /asUrl/,
          type: 'asset/resource',
        },
        // Raw file imports
        {
          resourceQuery: /raw/,
          type: 'asset/source',
        },
        // Theme/SCSS rules
        ...createThemeRules(themeTags, repoRoot, dist),
        // CSS files
        {
          test: /\.css$/,
          type: 'css',
        },
        // Images (including webp)
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024,
            },
          },
        },
        // Fonts
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
        },
        // HTML files (some plugins import HTML)
        {
          test: /\.html$/,
          type: 'asset/source',
        },
        // Markdown files
        {
          test: /\.md$/,
          type: 'asset/source',
        },
        // Plain text files (.text, .txt)
        {
          test: /\.(text|txt)$/,
          type: 'asset/source',
        },
      ],
    },

    optimization: {
      moduleIds: dist ? 'deterministic' : 'named',
      chunkIds: dist ? 'deterministic' : 'named',
      minimize: dist,
      minimizer: dist
        ? [
            new rspack.SwcJsMinimizerRspackPlugin({
              minimizerOptions: {
                compress: {
                  drop_console: false,
                  drop_debugger: true,
                },
                mangle: true,
              },
            }),
            new rspack.LightningCssMinimizerRspackPlugin({}),
          ]
        : [],
    },

    cache: cache
      ? {
          type: 'filesystem',
          cacheDirectory: Path.resolve(
            repoRoot,
            `node_modules/.cache/rspack-hybrid/${plugin.id}`
          ),
          buildDependencies: {
            config: [__filename],
          },
        }
      : false,

    plugins: [
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
      }),

      // Inject __kbnBundles__ registration at the end of the bundle
      new rspack.BannerPlugin({
        banner: generateBundleRegistration(plugin, isCore),
        footer: true, // Append to end of bundle
        raw: true, // Don't wrap in comment
        entryOnly: true, // Only main entry, not chunks
      }),
    ],

    stats: {
      preset: 'errors-warnings',
      timings: true,
    },

    // Ignore warnings for known issues
    ignoreWarnings: [
      // Server-side packages being imported in browser code
      /kbn-config-schema/,
      /kbn-alerts-as-data-utils/,
      // Node.js modules that have browser fallbacks
      /Can't resolve 'fs'/,
      /Can't resolve 'path'/,
      /Can't resolve 'child_process'/,
      /Can't resolve 'crypto'/,
      /Can't resolve 'stream'/,
      /Can't resolve 'os'/,
    ],
  };
}

/**
 * Generate JavaScript code to register the bundle with __kbnBundles__
 *
 * The __kbnBundles__ loader expects:
 * - define(id, bundleRequire, bundleModuleKey) to register
 * - bundleRequire(bundleModuleKey) is called to get the exports
 *
 * With UMD output, the module is assigned to a global variable.
 * We capture that and register it with __kbnBundles__.
 */
function generateBundleRegistration(plugin: PluginEntry, isCore: boolean): string {
  const bundleType = isCore ? 'entry' : 'plugin';
  const bundleId = `${bundleType}/${plugin.id}/public`;
  const globalName = isCore ? 'kibanaCore' : plugin.id.replace(/-/g, '_');

  return `
;(function() {
  // Kibana bundle registration for ${plugin.id}
  if (typeof __kbnBundles__ === 'undefined') {
    console.warn('[${plugin.id}] __kbnBundles__ not found');
    return;
  }

  // UMD assigns to global - capture it
  var bundleExports = (typeof self !== 'undefined' ? self : this)['${globalName}'];
  
  if (!bundleExports) {
    console.warn('[${plugin.id}] Bundle exports not found on global');
    return;
  }

  // Register with __kbnBundles__
  // The define signature is: define(id, bundleRequire, bundleModuleKey)
  __kbnBundles__.define('${bundleId}', function(key) {
    return bundleExports;
  }, 0);
})();
`;
}

function findEntry(contextDir: string): string | null {
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];

  for (const ext of extensions) {
    const entryPath = Path.resolve(contextDir, `public/index${ext}`);
    if (Fs.existsSync(entryPath)) {
      return entryPath;
    }
  }

  return null;
}
