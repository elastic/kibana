/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import Fs from 'fs';
import path from 'path';
import type { ModuleDiscoveryInfo } from './pick_scout_test_group_run_order';
import { getKibanaDir } from '../utils';

/**
 * Patterns for files that should never trigger burn-in testing.
 * Changes to these files are considered non-functional and won't
 * affect Scout test behavior.
 */
const SKIP_BURN_IN_PATTERNS: RegExp[] = [
  // Documentation & assets
  /\.md$/,
  /\.mdx$/,
  /\.asciidoc$/,
  /\.txt$/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
  // Config & meta files
  /package\.json$/,
  /tsconfig\.json$/,
  /jest\.config\.(ts|js)$/,
  /jest\.integration\.config\.(ts|js)$/,
  /\.eslintrc/,
  /\.prettierrc/,
  /kibana\.jsonc$/,
  // CI/CD files
  /^\.buildkite\//,
  /^\.github\//,
  // Documentation directories
  /^dev_docs\//,
  /^docs\//,
  /^api_docs\//,
  /^legacy_rfcs\//,
];

// ─── JSONC Parsing ───────────────────────────────────────────────────────────

interface KibanaJsonc {
  type?: string;
  id?: string;
  plugin?: {
    id?: string;
    requiredPlugins?: string[];
    optionalPlugins?: string[];
    requiredBundles?: string[];
  };
}

/**
 * Parse a kibana.jsonc file, stripping comments and trailing commas.
 * Returns null on any parse failure (missing file, invalid JSON, etc.)
 */
function readKibanaJsonc(filePath: string): KibanaJsonc | null {
  try {
    const content = Fs.readFileSync(filePath, 'utf-8');
    const stripped = content
      .split('\n')
      .map((line) => {
        // Strip // comments that are not inside strings
        let inString = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"' && (i === 0 || line[i - 1] !== '\\')) {
            inString = !inString;
          }
          if (!inString && line[i] === '/' && line[i + 1] === '/') {
            return line.substring(0, i);
          }
        }
        return line;
      })
      .join('\n')
      // Strip block comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Strip trailing commas before } or ]
      .replace(/,\s*([\]}])/g, '$1');

    return JSON.parse(stripped) as KibanaJsonc;
  } catch {
    return null;
  }
}

// ─── Git Change Detection ────────────────────────────────────────────────────

/**
 * Get the list of files changed in the PR compared to the target branch.
 * Uses git diff to compare the PR HEAD against the merge-base with the target branch.
 */
function getChangedFiles(): string[] {
  const baseBranch = process.env.GITHUB_PR_TARGET_BRANCH || 'main';

  // Ensure the base branch ref is available for diff
  try {
    execSync(`git fetch origin ${baseBranch} --depth=1`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  } catch {
    // Ignore fetch failures - the ref might already be available
  }

  try {
    const mergeBase = execSync(`git merge-base origin/${baseBranch} HEAD`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    const output = execSync(`git diff --name-only ${mergeBase} HEAD`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    return output.trim().split('\n').filter(Boolean);
  } catch {
    // Fallback: try three-dot diff syntax
    try {
      const output = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}

// ─── Module Path Utilities ───────────────────────────────────────────────────

/**
 * Extract the module base path from a Scout config path.
 * Scout configs follow the pattern: {module-base-path}/test/scout/{ui|api}/playwright.config.ts
 * Custom server configs follow: {module-base-path}/test/scout_{name}/{ui|api}/playwright.config.ts
 *
 * @returns The module base path (e.g., "x-pack/solutions/security/plugins/security_solution/")
 *          or null if the path doesn't match the expected pattern.
 */
function getModuleBasePath(configPath: string): string | null {
  const match = configPath.match(/^(.+?)\/test\/scout/);
  return match ? `${match[1]}/` : null;
}

/**
 * Build a map from module base paths to their modules, extracting base paths
 * from Scout config paths.
 */
function buildModulePathMap(
  allModules: ModuleDiscoveryInfo[]
): Map<string, ModuleDiscoveryInfo> {
  const modulePathToModule = new Map<string, ModuleDiscoveryInfo>();
  for (const module of allModules) {
    for (const config of module.configs) {
      const basePath = getModuleBasePath(config.path);
      if (basePath && !modulePathToModule.has(basePath)) {
        modulePathToModule.set(basePath, module);
      }
    }
  }
  return modulePathToModule;
}

// ─── Dependency Graph (Enhancement 1) ────────────────────────────────────────

/**
 * Read the plugin ID from a module's kibana.jsonc file.
 * Only plugin packages have a plugin.id field.
 */
function getPluginId(moduleBasePath: string): string | null {
  const kibanaDir = getKibanaDir();
  const manifestPath = path.resolve(kibanaDir, moduleBasePath, 'kibana.jsonc');
  const manifest = readKibanaJsonc(manifestPath);
  return manifest?.plugin?.id ?? null;
}

/**
 * Get all plugin dependencies declared in a module's kibana.jsonc.
 * Includes requiredPlugins, optionalPlugins, and requiredBundles.
 */
function getPluginDependencies(moduleBasePath: string): string[] {
  const kibanaDir = getKibanaDir();
  const manifestPath = path.resolve(kibanaDir, moduleBasePath, 'kibana.jsonc');
  const manifest = readKibanaJsonc(manifestPath);

  if (!manifest?.plugin) {
    return [];
  }

  const deps = new Set<string>();
  for (const dep of manifest.plugin.requiredPlugins ?? []) {
    deps.add(dep);
  }
  for (const dep of manifest.plugin.optionalPlugins ?? []) {
    deps.add(dep);
  }
  for (const dep of manifest.plugin.requiredBundles ?? []) {
    deps.add(dep);
  }

  return Array.from(deps);
}

/**
 * Find Scout test modules that depend on any of the directly changed modules,
 * using the plugin dependency graph from kibana.jsonc files.
 *
 * Algorithm:
 * 1. For each directly changed module path, read its plugin ID
 * 2. For each Scout test module, read its declared plugin dependencies
 * 3. If a Scout test module depends on a changed module's plugin ID, include it
 */
function findDependentModules(
  changedModulePaths: Set<string>,
  allModulePathMap: Map<string, ModuleDiscoveryInfo>,
  alreadyAffected: Set<string>
): Set<string> {
  const additionalAffected = new Set<string>();

  // Step 1: Collect plugin IDs from directly changed modules
  const changedPluginIds = new Set<string>();
  for (const modulePath of changedModulePaths) {
    const pluginId = getPluginId(modulePath);
    if (pluginId) {
      changedPluginIds.add(pluginId);
    }
  }

  if (changedPluginIds.size === 0) {
    return additionalAffected;
  }

  console.error(
    `scout burn-in [dep-graph]: Changed plugin IDs: ${Array.from(changedPluginIds).join(', ')}`
  );

  // Step 2: For each Scout test module, check if it depends on a changed plugin
  for (const [modulePath, module] of allModulePathMap) {
    // Skip modules already affected by direct directory matching
    if (alreadyAffected.has(module.name)) {
      continue;
    }

    const deps = getPluginDependencies(modulePath);
    const matchingDep = deps.find((dep) => changedPluginIds.has(dep));

    if (matchingDep) {
      additionalAffected.add(module.name);
      console.error(
        `scout burn-in [dep-graph]: ${module.name} depends on changed plugin '${matchingDep}'`
      );
    }
  }

  return additionalAffected;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Filter the full list of Scout modules to only those affected by the current PR changes.
 *
 * Uses two matching strategies:
 * 1. **Directory matching**: If a changed file falls within a module's directory,
 *    that module is affected.
 * 2. **Dependency graph matching**: If a changed module is a plugin and another
 *    Scout test module declares a dependency on it (via requiredPlugins,
 *    optionalPlugins, or requiredBundles in kibana.jsonc), the dependent module
 *    is also affected.
 *
 * @param allModules - The complete list of discovered Scout modules with configs
 * @returns Filtered list containing only modules affected by PR changes
 */
export function getChangedScoutModules(
  allModules: ModuleDiscoveryInfo[]
): ModuleDiscoveryInfo[] {
  const changedFiles = getChangedFiles();

  if (changedFiles.length === 0) {
    console.error('scout burn-in: No changed files detected');
    return [];
  }

  console.error(`scout burn-in: Detected ${changedFiles.length} changed file(s)`);

  // Filter out files that should never trigger burn-in
  const relevantChangedFiles = changedFiles.filter(
    (file) => !SKIP_BURN_IN_PATTERNS.some((pattern) => pattern.test(file))
  );

  if (relevantChangedFiles.length === 0) {
    console.error('scout burn-in: All changed files match skip patterns, no burn-in needed');
    return [];
  }

  console.error(
    `scout burn-in: ${relevantChangedFiles.length} file(s) after applying skip patterns`
  );

  // Build module path -> module mapping
  const modulePathToModule = buildModulePathMap(allModules);

  // Strategy 1: Direct directory matching
  const directlyAffected = new Set<string>();
  const changedModulePaths = new Set<string>();

  for (const file of relevantChangedFiles) {
    for (const [modulePath, module] of modulePathToModule) {
      if (file.startsWith(modulePath)) {
        directlyAffected.add(module.name);
        changedModulePaths.add(modulePath);
      }
    }
  }

  if (directlyAffected.size > 0) {
    console.error(
      `scout burn-in [direct]: ${directlyAffected.size} module(s): ${Array.from(directlyAffected).join(', ')}`
    );
  }

  // Strategy 2: Dependency graph matching
  // Also find all modules whose changed files belong to ANY module (not just Scout test modules)
  // by scanning all changed file paths against all known plugin directories
  const allChangedModulePaths = new Set<string>(changedModulePaths);

  // Scan changed files for module directories that may not have Scout tests themselves
  // but could be plugin dependencies of Scout test modules
  for (const file of relevantChangedFiles) {
    // Extract potential module path patterns from the file path
    // Plugins: */plugins/*/ or */packages/*/
    const pluginMatch = file.match(/^(.+?\/(?:plugins|packages)\/[^/]+\/[^/]+\/)/);
    if (pluginMatch) {
      allChangedModulePaths.add(pluginMatch[1]);
    }
  }

  const depGraphAffected = findDependentModules(
    allChangedModulePaths,
    modulePathToModule,
    directlyAffected
  );

  // Combine both strategies
  const allAffectedNames = new Set([...directlyAffected, ...depGraphAffected]);
  const affectedModules = allModules.filter((module) => allAffectedNames.has(module.name));

  if (depGraphAffected.size > 0) {
    console.error(
      `scout burn-in [dep-graph]: ${depGraphAffected.size} additional module(s): ${Array.from(depGraphAffected).join(', ')}`
    );
  }

  if (affectedModules.length > 0) {
    console.error(
      `scout burn-in: Total ${affectedModules.length} affected module(s): ${affectedModules
        .map((m) => m.name)
        .join(', ')}`
    );
  } else {
    console.error('scout burn-in: No Scout modules affected by PR changes');
  }

  return affectedModules;
}
