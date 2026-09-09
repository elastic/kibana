/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CRITICAL_FILES_JEST_INTEGRATION_TESTS,
  CRITICAL_FILES_JEST_UNIT_TESTS,
  filterFilesByPackages,
  getAffectedPackages,
  listChangedFiles,
  touchedCriticalFiles,
} from '../../affected-packages';

/**
 * The shared inputs both per-variant filters need: which packages the PR
 * affects and which files it changed. Returned as `null` when affected-packages
 * detection failed or yielded nothing — callers then skip filtering entirely.
 */
export interface SelectiveTestingContext {
  affectedPackages: Set<string>;
  prChangedFiles: string[];
}

/**
 * Resolve the affected-packages context once for a PR's mergeBase.
 * Returns `null` when detection failed, signaling that selective testing should be skipped.
 * An empty set means that no packages are affected, so no tests should be run.
 */
export async function resolveSelectiveTestingContext(
  mergeBase: string
): Promise<SelectiveTestingContext | null> {
  const affectedPackages = await getAffectedPackages(mergeBase, {
    strategy: 'git',
    includeDownstream: true,
    ignorePatterns: [], // might want to exclude metadata/text changes in the future
    ignoreUncategorizedChanges: true,
  }).catch((error) => {
    console.error('Error getting affected packages', error);
    return null;
  });

  if (!affectedPackages) {
    console.log('Not filtering Jest unit/integration tests because no affected packages found');
    return null;
  }

  console.log('Filtering Jest unit/integration tests for affected packages:', affectedPackages);
  const prChangedFiles = listChangedFiles({ mergeBase, commit: 'HEAD' });
  return { affectedPackages, prChangedFiles };
}

/** Narrow Jest unit configs to those owned by affected packages, unless a critical file changed. */
export function filterJestUnitConfigsByAffected(
  jestUnitConfigs: string[],
  context: SelectiveTestingContext
): string[] {
  return filterByAffected({
    label: 'unit',
    configs: jestUnitConfigs,
    criticalFiles: CRITICAL_FILES_JEST_UNIT_TESTS,
    context,
  });
}

/** Narrow Jest integration configs to those owned by affected packages, unless a critical file changed. */
export function filterJestIntegrationConfigsByAffected(
  jestIntegrationConfigs: string[],
  context: SelectiveTestingContext
): string[] {
  return filterByAffected({
    label: 'integration',
    configs: jestIntegrationConfigs,
    criticalFiles: CRITICAL_FILES_JEST_INTEGRATION_TESTS,
    context,
  });
}

function filterByAffected(args: {
  label: 'unit' | 'integration';
  configs: string[];
  criticalFiles: string[];
  context: SelectiveTestingContext;
}): string[] {
  const { label, configs, criticalFiles, context } = args;

  if (touchedCriticalFiles(context.prChangedFiles, criticalFiles)) {
    console.log(`Not filtering Jest ${label} tests because critical files changed`);
    return configs;
  }

  const filtered = filterFilesByPackages(configs, context.affectedPackages);
  console.log(`Filtering Jest ${label} tests: ${configs.length} -> ${filtered.length}`);
  return filtered;
}
