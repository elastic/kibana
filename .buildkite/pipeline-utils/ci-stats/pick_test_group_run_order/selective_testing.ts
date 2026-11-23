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
} from '../../affected-packages/index.ts';
import type { MoonTestSelection } from '../../affected-packages/moon_test_tasks.ts';

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
    // Documentation files (README, *.md, CHANGELOG*) can't affect runtime behaviour.
    ignorePatterns: ['**/README*', '**/*.md', '**/CHANGELOG*'],
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

/** Select Jest unit configs from affected packages and compare Moon selection. */
export function filterJestUnitConfigsByAffected(
  jestUnitConfigs: string[],
  context: SelectiveTestingContext,
  moonSelection?: MoonTestSelection
): string[] {
  return filterByAffected({
    label: 'unit',
    configs: jestUnitConfigs,
    criticalFiles: CRITICAL_FILES_JEST_UNIT_TESTS,
    context,
    moonSelection,
  });
}

/** Narrow Jest integration configs to those owned by affected packages, unless a critical file changed. */
export function filterJestIntegrationConfigsByAffected(
  jestIntegrationConfigs: string[],
  context: SelectiveTestingContext,
  moonSelection?: MoonTestSelection
): string[] {
  return filterByAffected({
    label: 'integration',
    configs: jestIntegrationConfigs,
    criticalFiles: CRITICAL_FILES_JEST_INTEGRATION_TESTS,
    context,
    moonSelection,
  });
}

function filterByAffected(args: {
  label: 'unit' | 'integration';
  configs: string[];
  criticalFiles: string[];
  context: SelectiveTestingContext;
  moonSelection?: MoonTestSelection;
}): string[] {
  const { label, configs, criticalFiles, context, moonSelection } = args;

  if (touchedCriticalFiles(context.prChangedFiles, criticalFiles)) {
    console.log(`Not filtering Jest ${label} tests because critical files changed`);
    return configs;
  }

  const packageSelected = filterFilesByPackages(configs, context.affectedPackages);
  if (moonSelection) {
    logMoonSelection(label, configs, packageSelected, moonSelection);
  }
  console.log(`Filtering Jest ${label} tests: ${configs.length} -> ${packageSelected.length}`);
  return packageSelected;
}

function logMoonSelection(
  label: 'unit' | 'integration',
  configs: string[],
  packageSelected: string[],
  { modeledConfigs, affectedConfigs }: MoonTestSelection
): void {
  const packageSet = new Set(packageSelected);
  const moonSelected = configs.filter((config) => affectedConfigs.has(config));
  const moonOnly = moonSelected.filter((config) => !packageSet.has(config));
  const packageOnly = packageSelected.filter(
    (config) => modeledConfigs.has(config) && !affectedConfigs.has(config)
  );
  console.log(
    `Moon Jest ${label} shadow selection: ${moonSelected.length} selected, ${moonOnly.length} Moon-only, ${packageOnly.length} package-only`
  );
}
