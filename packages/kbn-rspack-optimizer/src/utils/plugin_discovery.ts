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
import { Jsonc } from '@kbn/repo-packages';
import type { PluginEntry } from '../types';

/**
 * Minimal shape of a raw kibana.jsonc manifest as returned by Jsonc.parse().
 * This is NOT the same as KibanaPackageManifest from @kbn/repo-packages, which
 * represents the processed form where fields like testPlugin are moved to a
 * symbol-keyed PluginCategoryInfo object.
 */
interface RawKibanaManifest {
  id?: string;
  type?: string;
  plugin?: {
    id: string;
    browser?: boolean;
    testPlugin?: boolean;
    extraPublicDirs?: string[];
    requiredPlugins?: string[];
    requiredBundles?: string[];
    ignoreMetrics?: boolean;
  };
}

export type { PluginEntry };

export interface DiscoverPluginsOptions {
  repoRoot: string;
  outputRoot?: string;
  examples?: boolean;
  testPlugins?: boolean;
  limits?: Record<string, number>;
  focus?: string[];
  filter?: string[];
}

// Directories to scan for plugins
export const PLUGIN_DIRS = [
  'src/platform/plugins',
  'x-pack/platform/plugins',
  'x-pack/solutions',
  'src/plugins', // legacy location
  'x-pack/plugins', // legacy location
];

export const EXAMPLE_DIRS = ['examples'];

/**
 * Discover all Kibana plugins with UI bundles by scanning directories
 */
export async function discoverPlugins(options: DiscoverPluginsOptions): Promise<PluginEntry[]> {
  const { repoRoot, outputRoot = repoRoot, examples = false, testPlugins = false } = options;

  const plugins: PluginEntry[] = [];

  // Scan standard plugin directories
  for (const dir of PLUGIN_DIRS) {
    const fullDir = Path.resolve(repoRoot, dir);
    if (Fs.existsSync(fullDir)) {
      scanDirectory(fullDir, repoRoot, outputRoot, plugins, { examples, testPlugins });
    }
  }

  // Scan example directories if requested
  if (examples) {
    for (const dir of EXAMPLE_DIRS) {
      const fullDir = Path.resolve(repoRoot, dir);
      if (Fs.existsSync(fullDir)) {
        scanDirectory(fullDir, repoRoot, outputRoot, plugins, { examples: true, testPlugins });
      }
    }
  }

  // Apply filters if specified
  let result = plugins;

  if (options.focus?.length) {
    result = result.filter((p) => options.focus!.includes(p.id));
  }

  if (options.filter?.length) {
    result = result.filter((p) => !options.filter!.includes(p.id));
  }

  return result;
}

function scanDirectory(
  dir: string,
  repoRoot: string,
  outputRoot: string,
  plugins: PluginEntry[],
  options: { examples: boolean; testPlugins: boolean }
) {
  const entries = Fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const subDir = Path.join(dir, entry.name);

    // Check for kibana.jsonc manifest
    const manifestPath = Path.join(subDir, 'kibana.jsonc');
    if (Fs.existsSync(manifestPath)) {
      const plugin = parsePlugin(manifestPath, repoRoot, outputRoot, options);
      if (plugin) {
        plugins.push(plugin);
      } else {
        // Manifest exists but is not a plugin (e.g., test-helper, package)
        // Continue scanning subdirectories for nested plugins
        scanDirectory(subDir, repoRoot, outputRoot, plugins, options);
      }
    } else {
      // No manifest, recursively scan subdirectories
      scanDirectory(subDir, repoRoot, outputRoot, plugins, options);
    }
  }
}

function parsePlugin(
  manifestPath: string,
  repoRoot: string,
  outputRoot: string,
  options: { examples: boolean; testPlugins: boolean }
): PluginEntry | null {
  try {
    const manifestContent = Fs.readFileSync(manifestPath, 'utf8');
    const manifest = Jsonc.parse(manifestContent) as RawKibanaManifest;

    // Must be a plugin
    if (manifest.type !== 'plugin' || !manifest.plugin) {
      return null;
    }

    // Must have browser/UI
    if (!manifest.plugin.browser) {
      return null;
    }

    const contextDir = Path.dirname(manifestPath);
    const publicDir = Path.join(contextDir, 'public');

    // Must have public directory
    if (!Fs.existsSync(publicDir)) {
      return null;
    }

    // Skip examples unless requested
    const isExample = isExamplePlugin(contextDir, repoRoot);
    if (isExample && !options.examples) {
      return null;
    }

    // Skip test plugins unless requested
    // Use manifest-based detection (matching webpack optimizer's approach)
    // A plugin is a test plugin if it has "testPlugin: true" in its manifest categories
    const isTest = manifest.plugin.testPlugin === true;
    if (isTest && !options.testPlugins) {
      return null;
    }

    const id = manifest.plugin.id;
    const pkgId = manifest.id ?? id;

    return {
      id,
      pkgId,
      contextDir,
      outputDir: Path.join(contextDir, 'target/public'),
      targets: ['public', ...(manifest.plugin.extraPublicDirs ?? [])],
      requiredPlugins: manifest.plugin.requiredPlugins ?? [],
      requiredBundles: manifest.plugin.requiredBundles ?? [],
      manifestPath,
      type: 'plugin',
      ignoreMetrics: manifest.plugin.ignoreMetrics ?? false,
    };
  } catch (error) {
    // Skip invalid manifests
    return null;
  }
}

function isExamplePlugin(pluginDir: string, repoRoot: string): boolean {
  const relative = Path.relative(repoRoot, pluginDir);
  return relative.startsWith('examples') || relative.includes('/examples/');
}


/**
 * Create the core entry configuration
 */
export function createCoreEntry(repoRoot: string, outputRoot: string): PluginEntry {
  return {
    id: 'core',
    pkgId: '@kbn/core',
    contextDir: Path.resolve(repoRoot, 'src/core'),
    outputDir: Path.resolve(outputRoot, 'src/core/target/public'),
    targets: ['public'],
    requiredPlugins: [],
    requiredBundles: [],
    manifestPath: '',
    type: 'entry',
    ignoreMetrics: false,
  };
}
