/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findModuleForPath } from './module_lookup';
import { getAffectedModulesGit } from './strategy_git';
import { getAffectedProjectsMoon } from './strategy_moon';

export * from './const';
export * from './utils';
export { listChangedFiles } from './strategy_git';

export interface AffectedPackagesConfig {
  strategy?: 'git' | 'moon';
  includeDownstream?: boolean;
  /** Glob patterns for changed files to exclude before module resolution (git strategy only). */
  ignorePatterns?: string[];
  ignoreUncategorizedChanges?: boolean;
}

/**
 * Returns affected package IDs
 * Throws an error if the merge base is not found or if there is an error during the detection process
 */
export async function getAffectedPackages(
  mergeBase: string | undefined,
  configArgs: AffectedPackagesConfig = getConfigFromEnv()
): Promise<Set<string>> {
  if (!mergeBase) {
    throw new Error('No merge base found');
  }

  const config = {
    strategy: configArgs.strategy ?? 'git',
    includeDownstream: configArgs.includeDownstream ?? false,
    ignorePatterns: configArgs.ignorePatterns ?? [],
    ignoreUncategorizedChanges: configArgs.ignoreUncategorizedChanges ?? false,
  };

  try {
    const affectedPackages =
      config.strategy === 'git'
        ? getAffectedModulesGit({
            mergeBase,
            includeDownstream: config.includeDownstream,
            ignorePatterns: config.ignorePatterns,
            ignoreUncategorizedChanges: config.ignoreUncategorizedChanges,
          })
        : getAffectedProjectsMoon(mergeBase, config.includeDownstream);

    if (affectedPackages.size === 0) {
      console.warn('Warning: No affected packages found');
    }

    return affectedPackages;
  } catch (error) {
    console.error('Error during affected package detection', error);
    throw error;
  }
}

/**
 * Filter file paths to only those belonging to affected packages.
 * Returns all files when `affectedPackages` is null (filtering disabled).
 */
export function filterFilesByPackages(
  files: string[],
  affectedPackages: Set<string> | null
): string[] {
  if (affectedPackages === null) {
    return files;
  }
  if (affectedPackages.size === 0) {
    return [];
  }

  return files.filter((filePath) => {
    const moduleId = findModuleForPath(filePath);
    return !moduleId || affectedPackages.has(moduleId);
  });
}

function getConfigFromEnv(): AffectedPackagesConfig {
  const rawStrategy = process.env.AFFECTED_STRATEGY ?? 'git';
  if (rawStrategy !== 'git' && rawStrategy !== 'moon') {
    throw new Error(`Invalid AFFECTED_STRATEGY: ${rawStrategy}`);
  }
  const strategy = rawStrategy;
  const includeDownstream = process.env.AFFECTED_DOWNSTREAM !== 'false';
  const ignorePatterns = (process.env.AFFECTED_IGNORE || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const ignoreUncategorizedChanges = process.env.AFFECTED_IGNORE_UNCATEGORIZED_CHANGES !== 'false';

  return { strategy, includeDownstream, ignorePatterns, ignoreUncategorizedChanges };
}
