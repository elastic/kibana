/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { doAnyChangesMatch } from '../github';
import { findPackageForPath } from './package_lookup';
import { getAffectedPackagesGit } from './strategy_git';
import { getAffectedPackagesMoon } from './strategy_moon';

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
 * Get configuration from environment variables
 *
 * Environment variables:
 * - AFFECTED_STRATEGY: 'git' | 'moon' | 'disabled' (default: 'git')
 * - AFFECTED_DOWNSTREAM: 'true' | 'false' (default: 'true')
 * - AFFECTED_LOGGING: 'true' | 'false' (default: 'true')
 *
 * Note: Also supports legacy JEST_AFFECTED_* prefixed variables for backwards compatibility
 */
function getConfigFromEnv(): AffectedPackagesConfig {
  const strategy = (process.env.AFFECTED_STRATEGY ||
    process.env.JEST_AFFECTED_STRATEGY ||
    'git') as 'git' | 'moon' | 'disabled';
  const includeDownstream =
    (process.env.AFFECTED_DOWNSTREAM || process.env.JEST_AFFECTED_DOWNSTREAM) !== 'false';
  const logging = (process.env.AFFECTED_LOGGING || process.env.JEST_AFFECTED_LOGGING) !== 'false';

  return {
    strategy,
    includeDownstream,
    logging,
  };
}

/**
 * Check if changes require skipping filtering (e.g., infrastructure changes)
 */
async function shouldSkipFiltering(): Promise<boolean> {
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

/**
 * Filter file paths to only those in affected packages
 *
 * @param files - Array of file paths (relative to repo root)
 * @param affectedPackages - Set of affected package IDs
 *                           Pass null to skip filtering and return all files
 * @returns Filtered array of file paths
 */
export function filterFilesByAffectedPackages(
  files: string[],
  affectedPackages: Set<string> | null
): string[] {
  // If null, return all files (filtering disabled/skipped)
  if (affectedPackages === null) {
    return files;
  }

  // If empty set, no packages affected - return empty array
  if (affectedPackages.size === 0) {
    return [];
  }

  const filtered: string[] = [];

  for (const filePath of files) {
    const pkgId = findPackageForPath(filePath);

    if (pkgId && affectedPackages.has(pkgId)) {
      filtered.push(filePath);
    } else if (!pkgId) {
      // File is not in a package (e.g., root-level) - include it to be safe
      filtered.push(filePath);
    }
  }

  return filtered;
}

/**
 * Get affected packages for filtering files
 * Returns null if filtering should be skipped (disabled, no merge base, critical files, etc.)
 * Returns empty Set if no affected packages found
 *
 * @param mergeBase - Git commit to compare against (e.g., GITHUB_PR_MERGE_BASE)
 * @returns Set of affected package IDs, or null to skip filtering
 */
export async function getAffectedPackagesForFiltering(
  mergeBase: string | undefined
): Promise<Set<string> | null> {
  const config = getConfigFromEnv();
  const log = config.logging ? console.warn : () => {};

  // Check if filtering is disabled
  if (config.strategy === 'disabled') {
    log('Affected package filtering is disabled');
    return null;
  }

  // Check if we have a merge base
  if (!mergeBase) {
    log('No merge base found - skipping filtering');
    return null;
  }

  log('--- Detecting Affected Packages');

  // Check if we should skip filtering due to critical changes
  if (await shouldSkipFiltering()) {
    log('Critical infrastructure files changed - skipping filtering');
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
    return null;
  }
}

/**
 * Get affected packages using the configured strategy
 *
 * @param mergeBase - Git commit to compare against
 * @param config - Optional configuration override
 * @returns Set of affected package IDs
 */
export async function getAffectedPackages(
  mergeBase: string,
  config?: Partial<AffectedPackagesConfig>
): Promise<Set<string>> {
  const fullConfig = { ...getConfigFromEnv(), ...config };

  if (fullConfig.logging) {
    console.error(`Using ${fullConfig.strategy} strategy to detect affected packages`);
    console.error(`Merge base: ${mergeBase}`);
    console.error(`Include downstream: ${fullConfig.includeDownstream}`);
  }

  const startTime = Date.now();

  try {
    let packages: Set<string>;

    if (fullConfig.strategy === 'git') {
      packages = getAffectedPackagesGit(mergeBase, fullConfig.includeDownstream);
    } else if (fullConfig.strategy === 'moon') {
      packages = getAffectedPackagesMoon(mergeBase, fullConfig.includeDownstream);
    } else {
      return new Set<string>();
    }

    const durationMs = Date.now() - startTime;

    if (fullConfig.logging) {
      console.error(`Found ${packages.size} affected packages in ${durationMs}ms`);
      if (packages.size > 0 && packages.size <= 20) {
        console.error('Affected packages:', Array.from(packages).sort().join(', '));
      }
    }

    return packages;
  } catch (error) {
    console.error(`Failed to get affected packages using ${fullConfig.strategy} strategy:`, error);
    throw error;
  }
}
