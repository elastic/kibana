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
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import { parseKbnImportReq } from '@kbn/repo-packages';
import { DEFAULT_THEME_TAGS } from '@kbn/core-ui-settings-common';
import { discoverPlugins } from '../utils/plugin_discovery';
import { findTargetEntry } from '../utils/entry_generation';
import { loadDllManifest } from './dll_manifest';
import { getExternals } from './externals';
import {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
  computeConfigHash,
  getMinimizer,
} from './shared_config';
import type { ThemeTag } from '../types';

/**
 * Files that affect the external plugin RSPack build. Used as the single source
 * of truth for both computeConfigHash (version string) and
 * buildDependencies so they stay in sync. Repo-relative paths are resolved
 * against repoRoot; absolute paths (like the DLL manifest) are used as-is.
 */
const CACHE_CONFIG_FILES = [
  'packages/kbn-rspack-optimizer/src/config/create_external_plugin_config.ts',
  'packages/kbn-rspack-optimizer/src/config/shared_config.ts',
  'packages/kbn-rspack-optimizer/src/config/externals.ts',
  'packages/kbn-rspack-optimizer/src/loaders/theme_loader.ts',
  'packages/kbn-rspack-optimizer/src/loaders/require_interop_loader.ts',
  'packages/kbn-swc-config/src/browser.ts',
  'packages/kbn-transpiler-config/src/shared_config.ts',
  'package.json',
  UiSharedDepsNpm.dllManifestPath,
];

export interface ExternalPluginConfigOptions {
  /** Path to the Kibana repository root */
  repoRoot: string;
  /** Path to the plugin source directory */
  pluginDir: string;
  /** Plugin ID from kibana.json */
  pluginId: string;
  /** Output directory for the built bundle */
  outputDir: string;
  /** Build for production (minified) */
  dist?: boolean;
  /** Watch mode */
  watch?: boolean;
  /** Enable caching */
  cache?: boolean;
  /** Theme tags to compile (default: borealislight, borealisdark) */
  themeTags?: ThemeTag[];
}

/**
 * Create an RSPack configuration for building an EXTERNAL/third-party plugin.
 *
 * This config shares most of its configuration with the main Kibana build
 * (via shared_config.ts) to ensure consistency. The differences are:
 *
 * 1. Single plugin entry instead of unified entry
 * 2. Externalizes cross-plugin imports to __kbnBundles__.get()
 * 3. Output goes to a separate directory
 *
 * The output bundle can be loaded after kibana.bundle.js and will integrate
 * seamlessly with the Kibana plugin system.
 */
export async function createExternalPluginConfig(
  options: ExternalPluginConfigOptions
): Promise<Configuration> {
  const {
    repoRoot,
    pluginDir,
    pluginId,
    outputDir,
    dist = false,
    watch = false,
    cache = true,
    themeTags = [...DEFAULT_THEME_TAGS],
  } = options;

  // Discover all in-repo browser plugins to build the cross-plugin externals map.
  // We exclude examples and test plugins: the legacy kbn-plugin-helpers excluded
  // them from BundleRemotes for external builds, and external plugins should not
  // depend on them.
  const inRepoPlugins = await discoverPlugins({
    repoRoot,
    examples: false,
    testPlugins: false,
  });

  // Build targets map: pkgId -> { pluginId, targets }
  const pluginTargets = new Map<string, { pluginId: string; targets: string[] }>();
  for (const p of inRepoPlugins) {
    pluginTargets.set(p.pkgId, { pluginId: p.id, targets: p.targets });
  }

  // Read the external plugin's own manifest to compute its targets
  const pluginManifest = readPluginManifest(pluginDir);
  const pluginTargetDirs = ['public', ...(pluginManifest?.plugin?.extraPublicDirs ?? [])];

  // Find entry point
  const entryPath = findTargetEntry(pluginDir, 'public');
  if (!entryPath) {
    throw new Error(`No entry point found in ${pluginDir}/public/`);
  }

  // Create wrapper entry that registers with __kbnBundles__
  const wrapperDir = Path.resolve(outputDir, '.rspack-wrappers');
  if (!Fs.existsSync(wrapperDir)) {
    Fs.mkdirSync(wrapperDir, { recursive: true });
  }

  const wrapperPath = createPluginWrapper(wrapperDir, pluginId, pluginDir, pluginTargetDirs);

  // Get shared deps externals (React, EUI, etc.) - same as main build
  const sharedDepsExternals = getExternals();

  // eslint-disable-next-line no-console
  console.log(`[@kbn/rspack-optimizer] Building external plugin: ${pluginId}`);

  return {
    name: `plugin-${pluginId}`,
    mode: dist ? 'production' : 'development',
    // Match legacy webpack optimizer: no sourcemaps in dist, cheap-source-map in dev
    devtool: dist ? false : 'cheap-source-map',
    target: ['web', 'es2020'],
    context: pluginDir,

    entry: {
      [pluginId]: wrapperPath,
    },

    output: {
      path: outputDir,
      filename: `${pluginId}.plugin.js`,
      // Short hash names in production, descriptive names in development
      chunkFilename: dist
        ? `${pluginId}.[contenthash:8].js`
        : `${pluginId}.[name].[contenthash:8].js`,
      publicPath: 'auto',
      clean: !watch,
      uniqueName: pluginId,
    },

    // Externalize shared deps AND cross-plugin imports
    externals: [
      // Static externals for npm shared deps (same as main build)
      sharedDepsExternals,
      // Dynamic externals for cross-plugin imports (different from main build).
      // Uses callback-style externals to report errors when an import targets
      // an undeclared directory, matching legacy BundleRemotesPlugin semantics.
      createCrossPluginExternals(pluginTargets),
    ],

    // Use shared resolve config + fallbacks
    resolve: {
      ...getSharedResolveConfig(repoRoot),
      fallback: getSharedResolveFallback(),
    },

    module: {
      // Use shared module rules (same loaders as main build)
      // SWC for performance + require_interop_loader for ESM/CJS interop
      rules: getSharedModuleRules(repoRoot, dist, themeTags, `plugin-${pluginId}`),
    },

    optimization: {
      moduleIds: dist ? 'deterministic' : 'named',
      chunkIds: dist ? 'deterministic' : 'named',
      splitChunks: {
        chunks: 'async',
      },
      // Production optimizations (same as main build)
      minimize: dist,
      usedExports: dist,
      sideEffects: dist,
      concatenateModules: dist,
      minimizer: getMinimizer(dist),
    },

    experiments: {
      // Persistent cache for faster rebuilds
      cache: cache
        ? {
            type: 'persistent',
            buildDependencies: [
              Path.resolve(pluginDir, 'package.json'),
              ...CACHE_CONFIG_FILES.map((f) => Path.resolve(repoRoot, f)),
            ],
            version: `external-plugin-v3-${dist ? 'prod' : 'dev'}-${computeConfigHash(
              repoRoot,
              CACHE_CONFIG_FILES
            )}`,
            storage: {
              type: 'filesystem',
              directory: Path.resolve(
                pluginDir,
                'node_modules/.cache/.rspack-cache',
                dist ? 'dist' : 'dev'
              ),
            },
          }
        : false,
    },

    plugins: [
      // Same plugins as main build
      new NodeLibsBrowserPlugin() as any,
      new rspack.DllReferencePlugin({
        context: repoRoot,
        manifest: loadDllManifest(),
      }),
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
        'process.env.IS_KIBANA_DISTRIBUTABLE': JSON.stringify(dist ? 'true' : 'false'),
      }),
      new rspack.ProgressPlugin({
        prefix: `plugin:${pluginId}`,
      }),
    ],

    stats: {
      preset: 'errors-warnings',
      timings: true,
    },

    // Use shared ignore warnings
    ignoreWarnings: getSharedIgnoreWarnings(),
  };
}

/**
 * Create callback-style externals function for cross-plugin imports.
 *
 * External plugins must use `__kbnBundles__.get()` to access other plugins
 * since they're not bundled together like the main build. This function
 * validates imports against the declared targets of each in-repo plugin,
 * replicating the error semantics of the legacy `BundleRemotesPlugin`:
 *
 * - If an import targets a directory not declared in `extraPublicDirs`,
 *   the build fails with an explicit error message.
 * - If the import targets a declared directory, it's externalized to a
 *   `__kbnBundles__.get('plugin/{id}/{target}')` call.
 * - `@kbn/core/public` is handled as a special case.
 *
 * We use callback-style externals (rather than return-style) because
 * rspack's callback API lets us report build errors via `callback(new Error(...))`,
 * matching the legacy plugin's error-on-invalid-target behavior.
 *
 * The `convertPkgIdToPluginId` heuristic (error-prone kebab-to-camel conversion)
 * is replaced by the authoritative `pluginId` from the discovered manifest data.
 *
 * @see packages/kbn-optimizer/src/worker/bundle_remotes_plugin.ts (legacy equivalent)
 */
export function createCrossPluginExternals(
  pluginTargets: Map<string, { pluginId: string; targets: string[] }>
) {
  return ({ request }: { request?: string }, callback: (err?: Error, result?: string) => void) => {
    if (!request) return callback();

    // .json and ?raw imports are not cross-plugin externals
    // (legacy BundleRemotesPlugin excluded these)
    if (request.endsWith('.json') || request.endsWith('?raw')) {
      return callback();
    }

    const parsed = parseKbnImportReq(request);
    if (!parsed) return callback();

    // @kbn/core is not in the pluginTargets map — handle it specially
    if (parsed.pkgId === '@kbn/core') {
      if (parsed.target === 'public' || parsed.target.startsWith('public/')) {
        return callback(undefined, `__kbnBundles__.get('entry/core/public')`);
      }
      return callback();
    }

    const remote = pluginTargets.get(parsed.pkgId);
    if (!remote) return callback();

    if (!remote.targets.includes(parsed.target)) {
      return callback(
        new Error(
          `import [${request}] references a non-public export of the [${remote.pluginId}] ` +
            `bundle and must point to one of the public directories: [${remote.targets}]`
        )
      );
    }

    const bundleId = `plugin/${remote.pluginId}/${parsed.target}`;
    return callback(undefined, `__kbnBundles__.get('${bundleId}')`);
  };
}

/**
 * Read the plugin's `kibana.jsonc` manifest. Returns the parsed manifest
 * object or null if it doesn't exist / is malformed.
 */
function readPluginManifest(
  pluginDir: string
): { plugin?: { id?: string; extraPublicDirs?: string[]; browser?: boolean } } | null {
  const manifestPath = Path.join(pluginDir, 'kibana.jsonc');
  try {
    const raw = Fs.readFileSync(manifestPath, 'utf-8');
    // kibana.jsonc may contain comments; strip them with a simple regex
    // (JSON5/JSONC parsing — only single-line and block comments)
    const stripped = raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

/**
 * Create a wrapper entry module that:
 * 1. Imports each target entry of the plugin
 * 2. Registers all targets with `__kbnBundles__`
 *
 * The legacy optimizer registered every target in `['public', ...extraPublicDirs]`
 * with `__kbnBundles__.define()`. This ensures external plugins' extra targets
 * are also available at runtime via `__kbnBundles__.get('plugin/{id}/{target}')`.
 *
 * @param targets - The plugin's resolved targets (['public', ...extraPublicDirs])
 */
export function createPluginWrapper(
  wrapperDir: string,
  pluginId: string,
  pluginDir: string,
  targets: string[]
): string {
  const wrapperPath = Path.join(wrapperDir, `${pluginId}-wrapper.js`);

  // Resolve each target to an import + registration block.
  // Only include targets that have an index file (validated at build time).
  const targetEntries: Array<{ target: string; entryPath: string; varName: string }> = [];
  for (const target of targets) {
    const entryPath = findTargetEntry(pluginDir, target);
    if (entryPath) {
      const varName = `plugin_${target.replace(/[^a-zA-Z0-9]/g, '_')}`;
      targetEntries.push({ target, entryPath, varName });
    }
  }

  if (targetEntries.length === 0) {
    throw new Error(`No entry points found for plugin ${pluginId} in targets: [${targets}]`);
  }

  // IMPORTANT: We use `import * as varName` (full namespace import) and pass
  // `() => varName` to __kbnBundles__.define(). The full namespace reference
  // is necessary because __kbnBundles__ is a global outside the bundle graph,
  // and external plugins consume these exports at runtime via
  // __kbnBundles__.get(). Destructuring would allow the bundler to drop
  // exports that appear unused in this compilation scope.
  const imports = targetEntries
    .map((t) => `import * as ${t.varName} from ${JSON.stringify(t.entryPath)};`)
    .join('\n');

  const registrations = targetEntries
    .map(
      (t) =>
        `__kbnBundles__.define('plugin/${pluginId}/${t.target}', () => ${t.varName}, 'plugin/${pluginId}/${t.target}');`
    )
    .join('\n');

  // Use the first target (public) for the default re-export
  const primaryEntry = targetEntries[0];

  const content = `// Auto-generated wrapper for external plugin: ${pluginId}
// Targets registered: [${targets.join(', ')}]
// All targets validated at build time via findTargetEntry

${imports}

if (typeof __kbnBundles__ === 'undefined') {
  throw new Error(
    'External plugin "${pluginId}" loaded before Kibana bundles. ' +
    'Make sure to load this plugin after kibana.bundle.js'
  );
}

${registrations}

export * from ${JSON.stringify(primaryEntry.entryPath)};
export default ${primaryEntry.varName};
`;

  Fs.writeFileSync(wrapperPath, content);
  return wrapperPath;
}
