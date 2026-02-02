/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

// Note: Vite is ESM-only, so we import @kbn/vite-config types here
// and dynamically import the actual modules in the build function
import type { BundleRemote } from '@kbn/vite-config';

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
 * Build a single plugin bundle using Vite
 *
 * @param config Plugin build configuration
 * @returns Build result
 */
export async function buildPlugin(config: PluginBuildConfig): Promise<PluginBuildResult> {
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
    // Dynamic imports for ESM-only modules
    // Using Function constructor to avoid Babel transpiling import() to require()
    // eslint-disable-next-line no-new-func
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    const [viteModule, kbnViteConfig] = await Promise.all([
      dynamicImport('vite'),
      dynamicImport('@kbn/vite-config'),
    ]);
    const { build } = viteModule;

    const {
      createKbnBrowserConfig,
      kbnBundleRemotesPlugin,
      kbnStylesPlugin,
      kbnPeggyPlugin,
      kbnDotTextPlugin,
    } = kbnViteConfig;

    // Determine entry points
    const entry: Record<string, string> = {
      [bundleId]: Path.resolve(pluginDir, 'public/index.ts'),
    };

    // Add extra public dirs
    if (manifest.extraPublicDirs) {
      for (const dir of manifest.extraPublicDirs) {
        const entryName = `${bundleId}/${dir}`;
        entry[entryName] = Path.resolve(pluginDir, dir, 'index.ts');
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
