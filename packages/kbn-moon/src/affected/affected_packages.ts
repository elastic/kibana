/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findPackageForPath } from './package_lookup';
import { getAffectedPackagesGit } from './strategy_git';
import { getAffectedPackagesMoon } from './strategy_moon';

/**
 * Optional logger for affected package detection.
 * When omitted, no messages are emitted (e.g. when logging is disabled or in programmatic use).
 */
export type AffectedPackagesLog = (message: string, error?: unknown) => void;

/**
 * Configuration for affected package detection
 */
export interface AffectedPackagesConfig {
  /** Strategy to use: 'git' or 'moon' */
  strategy: 'git' | 'moon';
  /** Include downstream dependencies */
  includeDownstream: boolean;
  /** Enable detailed logging */
  logging: boolean;
}

/**
 * Get configuration from environment variables.
 *
 * Precedence: explicit config override > environment variables > defaults.
 *
 * Environment variables:
 * - AFFECTED_STRATEGY: 'git' | 'moon' (default: 'moon')
 * - AFFECTED_DOWNSTREAM: 'true' | 'false' (default: 'true')
 * - AFFECTED_LOGGING: 'true' | 'false' (default: 'true')
 *
 * Legacy JEST_AFFECTED_* variables are supported for backwards compatibility.
 */
function getConfigFromEnv(): AffectedPackagesConfig {
  const strategy = (process.env.AFFECTED_STRATEGY ||
    process.env.JEST_AFFECTED_STRATEGY ||
    'moon') as 'git' | 'moon';
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
 * Filter file paths to only those in affected packages.
 *
 * @param files - Array of file paths (relative to repo root)
 * @param affectedPackages - Set of affected package IDs, or null to skip filtering and return all files
 * @returns Filtered array of file paths
 */
export function filterFilesByAffectedPackages(
  files: string[],
  affectedPackages: Set<string> | null
): string[] {
  if (affectedPackages === null) {
    return files;
  }

  // Empty set: no packages affected, return no files
  if (affectedPackages.size === 0) {
    return [];
  }

  const filtered: string[] = [];
  for (const filePath of files) {
    const pkgId = findPackageForPath(filePath);
    if (pkgId && affectedPackages.has(pkgId)) {
      filtered.push(filePath);
    } else if (!pkgId) {
      // File is not in a package (e.g. root-level); include to be safe
      filtered.push(filePath);
    }
  }
  return filtered;
}

/**
 * Get affected packages using the configured strategy.
 *
 * @param mergeBase - Git commit to compare against
 * @param configOverride - Optional override for env-derived config
 * @param log - Optional logger (used when config.logging is true)
 * @returns Set of affected package IDs
 */
export async function getAffectedPackages(
  mergeBase: string,
  configOverride?: Partial<AffectedPackagesConfig>,
  log?: AffectedPackagesLog
): Promise<Set<string>> {
  const fullConfig = { ...getConfigFromEnv(), ...configOverride };
  const logger = fullConfig.logging && log ? log : undefined;

  if (logger) {
    logger(`Using ${fullConfig.strategy} strategy to detect affected packages`);
    logger(`Merge base: ${mergeBase}`);
    logger(`Include downstream: ${fullConfig.includeDownstream}`);
  }

  const startTime = Date.now();

  try {
    const packages =
      fullConfig.strategy === 'git'
        ? getAffectedPackagesGit(mergeBase, fullConfig.includeDownstream)
        : getAffectedPackagesMoon(mergeBase, fullConfig.includeDownstream);

    const durationMs = Date.now() - startTime;
    if (logger) {
      logger(`Found ${packages.size} affected packages in ${durationMs}ms`);
      if (packages.size > 0 && packages.size <= 20) {
        logger('Affected packages: ' + Array.from(packages).sort().join(', '));
      }
    }
    return packages;
  } catch (error) {
    if (logger) {
      logger(`Failed to get affected packages using ${fullConfig.strategy} strategy`, error);
    }
    throw error;
  }
}
