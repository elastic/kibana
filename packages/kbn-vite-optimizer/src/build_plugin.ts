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

// Note: Vite is ESM-only, so we import @kbn/vite-config types here
// and dynamically import the actual modules in the build function
import type { BundleRemote } from '@kbn/vite-config';

/**
 * Try to find an entry file (index.{ts,tsx,js,jsx}) in a directory.
 * Returns the absolute path to the first match, or null if none found.
 */
const ENTRY_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function resolveEntryFile(pluginDir: string, subDir: string): string | null {
  const dir = Path.resolve(pluginDir, subDir);
  for (const ext of ENTRY_EXTENSIONS) {
    const candidate = Path.join(dir, `index${ext}`);
    try {
      if (Fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // doesn't exist, try next
    }
  }
  return null;
}

/**
 * Configuration for building a plugin bundle
 */
export interface PluginBuildConfig {
  /**
   * Root directory of the Kibana repository
   */
  repoRoot: string;

  /**
   * Plugin directory
   */
  pluginDir: string;

  /**
   * Plugin manifest
   */
  manifest: {
    id: string;
    requiredPlugins?: string[];
    requiredBundles?: string[];
    extraPublicDirs?: string[];
  };

  /**
   * Whether this is a production build
   */
  isProduction: boolean;

  /**
   * Output directory
   */
  outputDir?: string;

  /**
   * Map of other bundle remotes
   */
  bundleRemotes?: Map<string, BundleRemote>;

  /**
   * Theme tags to support
   */
  themeTags?: string[];
}

/**
 * Build result for a plugin
 */
export interface PluginBuildResult {
  success: boolean;
  bundleId: string;
  outputDir: string;
  duration: number;
  bundleSize?: number;
  errors?: string[];
}

/**
 * Pre-imported Vite and @kbn/vite-config modules.
 * Pass these to buildPlugin() to avoid redundant dynamic imports.
 */
export interface PreloadedModules {
  vite: { build: (...args: any[]) => Promise<any> };
  kbnViteConfig: {
    createKbnBrowserConfig: (...args: any[]) => any;
    kbnBundleRemotesPlugin: (...args: any[]) => any;
    kbnStylesPlugin: (...args: any[]) => any;
    kbnPeggyPlugin: (...args: any[]) => any;
    kbnDotTextPlugin: (...args: any[]) => any;
  };
}

/**
 * Import vite and @kbn/vite-config once. Reuse across all plugin builds.
 */
export async function preloadBuildModules(): Promise<PreloadedModules> {
  const [vite, kbnViteConfig] = await Promise.all([import('vite'), import('@kbn/vite-config')]);
  return { vite, kbnViteConfig };
}

/**
 * Build a single plugin bundle using Vite
 *
 * @param config Plugin build configuration
 * @param modules Optional pre-imported modules (from preloadBuildModules)
 * @returns Build result
 */
export async function buildPlugin(
  config: PluginBuildConfig,
  modules?: PreloadedModules
): Promise<PluginBuildResult> {
  const {
    repoRoot,
    pluginDir,
    manifest,
    isProduction,
    outputDir = Path.resolve(pluginDir, 'target/public'),
    bundleRemotes = new Map(),
    themeTags = ['borealislight', 'borealisdark'],
  } = config;

  const startTime = Date.now();
  const bundleId = manifest.id;

  try {
    // Use pre-imported modules if available, otherwise import on demand
    const { vite, kbnViteConfig } = modules ?? (await preloadBuildModules());
    const { build } = vite;
    const {
      createKbnBrowserConfig,
      kbnBundleRemotesPlugin,
      kbnStylesPlugin,
      kbnPeggyPlugin,
      kbnDotTextPlugin,
    } = kbnViteConfig;

    // Determine entry points
    const entry: Record<string, string> = {};

    // Find the main public entry — try common extensions
    const mainEntry = resolveEntryFile(pluginDir, 'public');
    if (mainEntry) {
      entry[bundleId] = mainEntry;
    } else {
      throw new Error(
        `Cannot find entry file for plugin [${bundleId}]: ` +
          `no index.{ts,tsx,js,jsx} in ${Path.resolve(pluginDir, 'public')}`
      );
    }

    // Add extra public dirs (skip dirs that no longer exist)
    if (manifest.extraPublicDirs) {
      for (const dir of manifest.extraPublicDirs) {
        const entryFile = resolveEntryFile(pluginDir, dir);
        if (entryFile) {
          const entryName = `${bundleId}/${dir}`;
          entry[entryName] = entryFile;
        }
        // If the dir/entry doesn't exist, skip silently — the manifest
        // may reference dirs that were removed or moved.
      }
    }

    // Create Vite config
    const viteConfig = createKbnBrowserConfig({
      repoRoot,
      packageRoot: pluginDir,
      isProduction,
      entry,
      outDir: outputDir,
      plugins: [
        kbnBundleRemotesPlugin({
          repoRoot,
          bundle: {
            id: bundleId,
            pkgId: `@kbn/${bundleId}-plugin`,
            manifestPath: Path.resolve(pluginDir, 'kibana.jsonc'),
          },
          remotes: bundleRemotes,
          validateDependencies: isProduction,
          externalize: true,
        }),
        kbnStylesPlugin({
          repoRoot,
          themeTags,
          isProduction,
        }),
        kbnPeggyPlugin(),
        kbnDotTextPlugin(),
      ],
    });

    // Run Vite build
    await build({
      ...viteConfig,
      configFile: false,
      logLevel: isProduction ? 'warn' : 'info',
    });

    const duration = Date.now() - startTime;

    return {
      success: true,
      bundleId,
      outputDir,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      bundleId,
      outputDir,
      duration,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
