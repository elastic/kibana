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
import { load as loadYaml } from 'js-yaml';
import type { ModuleDiscoveryInfo } from './pick_scout_test_group_run_order';
import { getKibanaDir } from '../utils';

/**
 * Inclusive patterns for source files that could affect Scout test behavior.
 * Only files matching these patterns will be considered for burn-in triggering.
 * This is more robust than an exclusion list as it won't miss new file types.
 */
const SOURCE_FILE_PATTERNS: RegExp[] = [
  /\.(ts|tsx|js|jsx)$/,
  /\.(scss|css|less)$/,
  /\.(json)$/, // Might include config files relevant to runtime
  /\.(html|pug|ejs)$/,
];

/**
 * Paths that should always be excluded even if they match source patterns.
 * These are test infrastructure paths, not runtime source code.
 */
const ALWAYS_EXCLUDE_PATHS: RegExp[] = [
  /^\.buildkite\//,
  /^\.github\//,
  /^dev_docs\//,
  /^docs\//,
  /^api_docs\//,
  /^legacy_rfcs\//,
  /\/jest\.config\.(ts|js)$/,
  /\/jest\.integration\.config\.(ts|js)$/,
  /\/__mocks__\//,
  /\/__fixtures__\//,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.mock\.(ts|tsx|js|jsx)$/,
  /\.stories\.(ts|tsx|js|jsx)$/,
  /\.d\.ts$/,
];

// ─── Moon Dependency Graph ──────────────────────────────────────────────────

interface MoonProject {
  id: string;
  dependsOn: string[];
  metadata?: {
    sourceRoot?: string;
  };
}

/**
 * Read and parse a moon.yml file to extract project ID and dependencies.
 * Moon files are auto-generated from kibana.jsonc + tsconfig.json, so they
 * provide a single source of truth for the full project dependency graph.
 */
function readMoonYml(filePath: string): MoonProject | null {
  try {
    const content = Fs.readFileSync(filePath, 'utf-8');
    const parsed = loadYaml(content) as Record<string, unknown>;
    return {
      id: (parsed.id as string) ?? '',
      dependsOn: (parsed.dependsOn as string[]) ?? [],
      metadata: {
        sourceRoot: ((parsed.project as Record<string, unknown>)?.metadata as Record<string, unknown>)
          ?.sourceRoot as string | undefined,
      },
    };
  } catch {
    return null;
  }
}

// ─── Git Change Detection ────────────────────────────────────────────────────

/**
 * Get the list of files changed in the PR compared to the target branch.
 * Uses the pre-computed GITHUB_PR_MERGE_BASE env var (set by Kibana's bootstrap)
 * to diff against the merge-base, avoiding issues with shallow clones in CI.
 */
function getChangedFiles(): string[] {
  // Prefer the merge-base already computed by Kibana's bootstrap (set_git_merge_base in util.sh)
  const mergeBase = process.env.GITHUB_PR_MERGE_BASE;

  if (mergeBase) {
    try {
      const output = execSync(`git diff --name-only ${mergeBase} HEAD`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      return output.trim().split('\n').filter(Boolean);
    } catch (ex) {
      console.error(`scout burn-in: git diff with GITHUB_PR_MERGE_BASE failed: ${ex}`);
    }
  }

  // Fallback: compute merge-base manually (works outside CI or when env var is missing)
  const baseBranch = process.env.GITHUB_PR_TARGET_BRANCH || 'main';

  try {
    execSync(`git fetch origin ${baseBranch} --depth=200`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  } catch {
    // Ignore fetch failures - the ref might already be available
  }

  try {
    const computedMergeBase = execSync(`git merge-base origin/${baseBranch} HEAD`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    const output = execSync(`git diff --name-only ${computedMergeBase} HEAD`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    return output.trim().split('\n').filter(Boolean);
  } catch {
    // Last resort fallback: three-dot diff syntax
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

/**
 * Filter changed files to only those that are relevant source files.
 * Uses inclusive matching: only files matching SOURCE_FILE_PATTERNS are kept,
 * and files matching ALWAYS_EXCLUDE_PATHS are removed.
 */
function filterRelevantFiles(changedFiles: string[]): string[] {
  return changedFiles.filter(
    (file) =>
      SOURCE_FILE_PATTERNS.some((p) => p.test(file)) &&
      !ALWAYS_EXCLUDE_PATHS.some((p) => p.test(file))
  );
}

// ─── Module Path Utilities ───────────────────────────────────────────────────

/**
 * Extract the module base path from a Scout config path.
 * Scout configs follow the pattern: {module-base-path}/test/scout/{ui|api}/playwright.config.ts
 */
function getModuleBasePath(configPath: string): string | null {
  const match = configPath.match(/^(.+?)\/test\/scout/);
  return match ? `${match[1]}/` : null;
}

/**
 * Build a map from module base paths to their modules, extracting base paths
 * from Scout config paths.
 */
function buildModulePathMap(allModules: ModuleDiscoveryInfo[]): Map<string, ModuleDiscoveryInfo> {
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

// ─── Dependency Graph via Moon ──────────────────────────────────────────────

/**
 * Read the Moon project ID from a module's moon.yml file.
 */
function getMoonProjectId(moduleBasePath: string): string | null {
  const kibanaDir = getKibanaDir();
  const moonPath = path.resolve(kibanaDir, moduleBasePath, 'moon.yml');
  const moon = readMoonYml(moonPath);
  return moon?.id ?? null;
}

/**
 * Get all project dependencies declared in a module's moon.yml.
 * Moon's dependsOn is generated from tsconfig.json kbn_references and provides
 * a comprehensive view of all package/plugin dependencies.
 */
function getMoonDependencies(moduleBasePath: string): string[] {
  const kibanaDir = getKibanaDir();
  const moonPath = path.resolve(kibanaDir, moduleBasePath, 'moon.yml');
  const moon = readMoonYml(moonPath);
  return moon?.dependsOn ?? [];
}

/**
 * Find Scout test modules that depend on any of the directly changed modules,
 * using Moon's project dependency graph (dependsOn from moon.yml).
 *
 * Moon's dependency graph is more comprehensive than kibana.jsonc alone as it
 * includes all kbn_references from tsconfig.json, covering both plugin and
 * package dependencies.
 */
function findDependentModules(
  changedModulePaths: Set<string>,
  allModulePathMap: Map<string, ModuleDiscoveryInfo>,
  alreadyAffected: Set<string>
): Set<string> {
  const additionalAffected = new Set<string>();

  // Step 1: Collect Moon project IDs from directly changed modules
  const changedProjectIds = new Set<string>();
  for (const modulePath of changedModulePaths) {
    const projectId = getMoonProjectId(modulePath);
    if (projectId) {
      changedProjectIds.add(projectId);
    }
  }

  if (changedProjectIds.size === 0) {
    return additionalAffected;
  }

  console.error(
    `scout burn-in [dep-graph]: Changed project IDs: ${Array.from(changedProjectIds).join(', ')}`
  );

  // Step 2: For each Scout test module, check if it depends on a changed project
  for (const [modulePath, module] of allModulePathMap) {
    if (alreadyAffected.has(module.name)) {
      continue;
    }

    const deps = getMoonDependencies(modulePath);
    const matchingDep = deps.find((dep) => changedProjectIds.has(dep));

    if (matchingDep) {
      additionalAffected.add(module.name);
      console.error(
        `scout burn-in [dep-graph]: ${module.name} depends on changed project '${matchingDep}'`
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
 * 1. **Directory matching**: If a changed source file falls within a module's directory,
 *    that module is affected.
 * 2. **Dependency graph matching** (via Moon): If a changed module is listed as a
 *    dependency in another Scout test module's moon.yml dependsOn, the dependent
 *    module is also affected.
 *
 * File filtering uses inclusive patterns (only source files like .ts, .tsx, .js, etc.)
 * rather than an exclusion list, so new non-source file types won't accidentally
 * trigger burn-in.
 *
 * @param allModules - The complete list of discovered Scout modules with configs
 * @returns Filtered list containing only modules affected by PR changes
 */
export function getChangedScoutModules(allModules: ModuleDiscoveryInfo[]): ModuleDiscoveryInfo[] {
  const changedFiles = getChangedFiles();

  if (changedFiles.length === 0) {
    console.error('scout burn-in: No changed files detected');
    return [];
  }

  console.error(`scout burn-in: Detected ${changedFiles.length} changed file(s)`);

  // Filter to only relevant source files (inclusive pattern)
  const relevantChangedFiles = filterRelevantFiles(changedFiles);

  if (relevantChangedFiles.length === 0) {
    console.error('scout burn-in: No relevant source files changed, no burn-in needed');
    return [];
  }

  console.error(
    `scout burn-in: ${relevantChangedFiles.length} relevant source file(s) after filtering`
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
      `scout burn-in [direct]: ${directlyAffected.size} module(s): ${Array.from(
        directlyAffected
      ).join(', ')}`
    );
  }

  // Strategy 2: Dependency graph matching via Moon
  // Scan changed files for module directories that may not have Scout tests themselves
  // but could be dependencies of Scout test modules
  const allChangedModulePaths = new Set<string>(changedModulePaths);

  for (const file of relevantChangedFiles) {
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
      `scout burn-in [dep-graph]: ${depGraphAffected.size} additional module(s): ${Array.from(
        depGraphAffected
      ).join(', ')}`
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
