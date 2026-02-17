/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { doAnyChangesMatch } from '../github';
import { getKibanaDir } from '../utils';

const REPO_ROOT = getKibanaDir();

/**
 * Configuration for affected package detection
 */
export interface AffectedPackagesConfig {
  /**
   * Strategy to use: 'git' | 'moon' | 'disabled'
   */
  strategy: 'git' | 'moon' | 'disabled';

  /**
   * Include downstream dependencies
   */
  includeDownstream: boolean;

  /**
   * Enable detailed logging
   */
  logging: boolean;
}

/**
 * Filter Jest configs to only those in affected packages
 *
 * @param configs - Array of Jest config paths
 * @param affectedPackages - Set of affected package IDs (from getAffectedPackagesForFiltering)
 *                           Pass null to skip filtering and return all configs
 * @returns Filtered array of config paths
 */
export function filterConfigsByAffectedPackages(
  configs: string[],
  affectedPackages: Set<string> | null
): string[] {
  // If null, return all configs (filtering disabled/skipped)
  if (affectedPackages === null) {
    return configs;
  }

  // If empty set, no packages affected - return empty array
  if (affectedPackages.size === 0) {
    return [];
  }

  const filtered: string[] = [];

  for (const configPath of configs) {
    const pkgId = findPackageForPath(configPath);

    if (pkgId && affectedPackages.has(pkgId)) {
      filtered.push(configPath);
    } else if (!pkgId) {
      // Config is not in a package (e.g., root-level test) - include it to be safe
      filtered.push(configPath);
    }
  }

  return filtered;
}

/**
 * Get affected packages for filtering Jest configs
 * Returns null if filtering should be skipped (disabled, no merge base, critical files, etc.)
 * Returns empty Set if no affected packages found (will skip all tests)
 *
 * @param mergeBase - Git commit to compare against (from GITHUB_PR_MERGE_BASE)
 * @returns Set of affected package IDs, or null to skip filtering
 */
export async function getAffectedPackagesForFiltering(
  mergeBase: string | undefined
): Promise<Set<string> | null> {
  const config = getConfigFromEnv();
  const log = config.logging ? console.warn : () => {}; // only use warn if logging is enabled, the output is parsed as buildkite step def.

  // Check if filtering is disabled
  if (config.strategy === 'disabled') {
    log('Affected package filtering is disabled');
    return null;
  }

  // Check if we have a merge base
  if (!mergeBase) {
    log('No GITHUB_PR_MERGE_BASE found - running all tests');
    return null;
  }

  log('--- Detecting Affected Packages for Jest Filtering');

  // Check if we should run all tests due to critical changes
  const runAll = (await shouldRunAllTests()) && false;
  if (runAll) {
    log('Critical infrastructure files changed - running all tests (no affected filtering)');
    return null;
  }

  // Get affected packages
  try {
    const affectedPackages =
      config.strategy === 'git'
        ? getAffectedPackagesGit(mergeBase, config.includeDownstream)
        : getAffectedPackagesMoon(mergeBase, config.includeDownstream);
    if (affectedPackages.size === 0) {
      log('Warning: No affected packages found');
    }

    return affectedPackages;
  } catch (error) {
    console.error('Error during affected package detection:', error);
    log('Error during affected package detection:', error);
    return null;
  }
}

/**
 * Get configuration from environment variables
 */
function getConfigFromEnv(): AffectedPackagesConfig {
  const strategy = (process.env.JEST_AFFECTED_STRATEGY || 'git') as 'git' | 'moon' | 'disabled';
  const includeDownstream = process.env.JEST_AFFECTED_DOWNSTREAM !== 'false'; // Default to true
  const logging = process.env.JEST_AFFECTED_LOGGING !== 'false'; // Default to true

  return {
    strategy,
    includeDownstream,
    logging,
  };
}

let cachedPackageLookup: Map<string, string> | null = null;
/**
 * Get all @kbn packages from package.json
 * Returns a map of package directory -> package name
 */
function getPackageLookup(): Map<string, string> {
  if (cachedPackageLookup != null) {
    return cachedPackageLookup;
  }

  const packageJsonPath = path.join(REPO_ROOT, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const packageLookup = new Map<string, string>();
  for (const [packageName, packageLink] of Object.entries<string>(allDependencies)) {
    if (packageName.startsWith('@kbn/')) {
      const packageDir = packageLink.replace(/^link:/, '');
      packageLookup.set(packageDir, packageName);
    }
  }

  cachedPackageLookup = packageLookup;

  return packageLookup;
}

/**
 * Build a dependency graph that maps each package to its downstream dependents
 */
function buildDownstreamDependencyGraph(): Map<string, Set<string>> {
  const downstreamMap = new Map<string, Set<string>>();
  const packageLookup = getPackageLookup();

  // Initialize empty sets for all packages
  for (const packageName of packageLookup.values()) {
    downstreamMap.set(packageName, new Set<string>());
  }

  // For each package, add it to the downstream set of all its dependencies
  for (const [packageDir, packageName] of packageLookup.entries()) {
    const dependencies = getDependenciesForPackage(packageDir);
    for (const depId of dependencies) {
      const downstreams = downstreamMap.get(depId);
      if (downstreams) {
        downstreams.add(packageName);
      }
    }
  }

  return downstreamMap;
}

/**
 * Get dependencies for a package from its moon.yml or tsconfig.json
 */
function getDependenciesForPackage(packageDir: string): string[] {
  // Try to read dependencies from moon.yml first
  const moonYmlPath = path.join(REPO_ROOT, packageDir, 'moon.yml');
  try {
    const moonYmlContent = fs.readFileSync(moonYmlPath, 'utf8');
    const moonConfig = yaml.load(moonYmlContent) as any;
    if (moonConfig?.dependsOn && Array.isArray(moonConfig.dependsOn)) {
      return moonConfig.dependsOn;
    }
  } catch (error) {
    // moon.yml doesn't exist or can't be read, try tsconfig
  }

  // Fallback to tsconfig.json kbn_references
  const tsconfigPath = path.join(REPO_ROOT, packageDir, 'tsconfig.json');
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    if (tsconfig?.kbn_references && Array.isArray(tsconfig.kbn_references)) {
      return tsconfig.kbn_references;
    }
  } catch (error) {
    // tsconfig doesn't exist or can't be read
  }

  return [];
}

/**
 * Get the downstream dependents of a set of packages (deep traversal)
 */
function getDownstreamDependents(packageIds: Set<string>): Set<string> {
  const downstreamMap = buildDownstreamDependencyGraph();
  const result = new Set<string>(packageIds);

  // Deep traversal: keep adding dependents until no new ones are found
  const queue = Array.from(packageIds);
  const visited = new Set<string>(packageIds);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = downstreamMap.get(current);

    if (dependents) {
      for (const dependent of Array.from(dependents)) {
        if (!visited.has(dependent)) {
          visited.add(dependent);
          queue.push(dependent);
          result.add(dependent);
        }
      }
    }
  }

  return result;
}

/**
 * Git-based strategy: Get affected packages by mapping changed files to packages
 */
function getAffectedPackagesGit(mergeBase: string, includeDownstream: boolean): Set<string> {
  // Get changed files from git
  const output = execSync(`git diff --name-only ${mergeBase} HEAD`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
  });

  const changedFiles = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  // Map files to packages
  const directlyAffectedPackages = new Set<string>();
  for (const file of changedFiles) {
    const pkgId = findPackageForPath(file);
    if (pkgId) {
      directlyAffectedPackages.add(pkgId);
    }
  }

  // Get downstream dependents if requested
  if (includeDownstream) {
    return getDownstreamDependents(directlyAffectedPackages);
  } else {
    return directlyAffectedPackages;
  }
}

/**
 * Moon-based strategy: Use moon query to get affected projects
 */
function getAffectedPackagesMoon(mergeBase: string, includeDownstream: boolean): Set<string> {
  // Build the moon query command
  const downstreamFlag = includeDownstream ? '--downstream deep' : '';
  const command = `moon query projects --affected ${downstreamFlag} --tags jest-unit-tests --json`;

  const output = execSync(command, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    env: {
      ...process.env,
      MOON_BASE: mergeBase,
    },
    timeout: 30000, // 30 seconds
  });

  const result = JSON.parse(output);

  // Extract project IDs from the response
  const packageIds = new Set<string>();
  if (result.projects && Array.isArray(result.projects)) {
    for (const project of result.projects) {
      if (project.id) {
        packageIds.add(project.id);
      }
    }
  }

  return packageIds;
}

/**
 * Check if changes require running all tests (e.g., infrastructure changes)
 */
async function shouldRunAllTests(): Promise<boolean> {
  const criticalPaths = [
    '.buildkite/',
    'scripts/jest.js',
    'scripts/jest',
    'package.json',
    'yarn.lock',
    'tsconfig.json',
    'tsconfig.base.json',
    '.moon/workspace.yml',
    '.moon/tasks/',
    'src/platform/packages/shared/kbn-test/',
  ];

  return doAnyChangesMatch(criticalPaths.map((p) => new RegExp(p)));
}

function findPackageForPath(filePath: string): string | undefined {
  const packageLookup = getPackageLookup();

  // find the longest prefix of the path that is a key in the packageLookup
  let longestPrefix = '';
  for (const packageDir of packageLookup.keys()) {
    if (filePath.startsWith(packageDir)) {
      if (packageDir.length > longestPrefix.length) {
        longestPrefix = packageDir;
      }
    }
  }

  return packageLookup.get(longestPrefix);
}
