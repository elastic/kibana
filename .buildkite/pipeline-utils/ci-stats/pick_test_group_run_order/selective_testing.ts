/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALWAYS_RUN_JEST_INTEGRATION_CONFIGS,
  CRITICAL_FILES_JEST_INTEGRATION_TESTS,
  CRITICAL_FILES_JEST_UNIT_TESTS,
  filterFilesByPackages,
  filterIgnoredFiles,
  getAffectedPackages,
  createScopeMatcher,
} from '../../affected-packages/index.ts';

import { expandJestImplicitConsumers } from './jest_implicit_consumers.ts';
import { SHARD_ANNOTATION_SEP } from './jest_configs.ts';
import type { MoonTestSelection } from '../../affected-packages/moon_test_tasks.ts';

const MAX_LOGGED_CRITICAL_FILES = 20;

// Documentation files (README, *.md, CHANGELOG*) can't affect runtime behaviour.
const DOCUMENTATION_IGNORE_PATTERNS = ['**/README*', '**/*.md', '**/CHANGELOG*'] as const;

/** Inputs shared by Jest package filtering and critical-file checks. */
export interface SelectiveTestingContext {
  affectedPackages: Set<string>;
  changedFiles: string[];
}

/** Returns null on detection failure; an empty affectedPackages set is a valid result. */
export async function resolveSelectiveTestingContext(
  changedFiles: string[]
): Promise<SelectiveTestingContext | null> {
  const affectedPackages = await getAffectedPackages(undefined, {
    changedFiles,
    strategy: 'git',
    includeDownstream: true,
    ignorePatterns: DOCUMENTATION_IGNORE_PATTERNS,
    ignoreUncategorizedChanges: true,
  }).catch((error) => {
    console.error('Error getting affected packages', error);
    return null;
  });

  if (!affectedPackages) {
    console.log('Not filtering Jest unit/integration tests because no affected packages found');
    return null;
  }

  const expandedAffectedPackages = expandJestImplicitConsumers(affectedPackages, changedFiles);
  console.log(
    'Filtering Jest unit/integration tests for affected packages:',
    expandedAffectedPackages
  );
  return { affectedPackages: expandedAffectedPackages, changedFiles };
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

/** Like the unit filter, but always re-adds ALWAYS_RUN_JEST_INTEGRATION_CONFIGS. */
export function filterJestIntegrationConfigsByAffected(
  jestIntegrationConfigs: string[],
  context: SelectiveTestingContext,
  moonSelection?: MoonTestSelection
): string[] {
  return filterByAffected({
    label: 'integration',
    configs: jestIntegrationConfigs,
    criticalFiles: CRITICAL_FILES_JEST_INTEGRATION_TESTS,
    alwaysRun: ALWAYS_RUN_JEST_INTEGRATION_CONFIGS,
    context,
    moonSelection,
  });
}

function filterByAffected(args: {
  label: 'unit' | 'integration';
  configs: string[];
  criticalFiles: string[];
  alwaysRun?: readonly string[];
  context: SelectiveTestingContext;
  moonSelection?: MoonTestSelection;
}): string[] {
  const { label, configs, criticalFiles, alwaysRun = [], context, moonSelection } = args;

  // Docs are ignored here too, so a docs-only change in a critical package doesn't run everything.
  const matchedCriticalFiles = filterIgnoredFiles(
    context.changedFiles,
    DOCUMENTATION_IGNORE_PATTERNS
  ).filter(createScopeMatcher(criticalFiles));
  if (matchedCriticalFiles.length > 0) {
    const displayedFiles = matchedCriticalFiles.slice(0, MAX_LOGGED_CRITICAL_FILES);
    const omittedCount = matchedCriticalFiles.length - displayedFiles.length;
    const suffix = omittedCount > 0 ? `, and ${omittedCount} more` : '';
    console.log(
      `Not filtering Jest ${label} tests because critical files changed: ${displayedFiles.join(
        ', '
      )}${suffix}`
    );
    return configs;
  }

  const packageSelected = filterFilesByPackages(configs, context.affectedPackages);
  if (moonSelection) {
    logMoonSelection(label, configs, packageSelected, moonSelection);
  }
  const withAlwaysRun = addAlwaysRunConfigs(packageSelected, configs, alwaysRun);
  console.log(`Filtering Jest ${label} tests: ${configs.length} -> ${withAlwaysRun.length}`);
  return withAlwaysRun;
}

function logMoonSelection(
  label: 'unit' | 'integration',
  configs: string[],
  packageSelected: string[],
  { modeledConfigs, affectedConfigs }: MoonTestSelection
): void {
  const packageSet = new Set(packageSelected);
  const moonSelected = configs.filter((config) => affectedConfigs.has(baseConfigPath(config)));
  const moonOnly = moonSelected.filter((config) => !packageSet.has(config));
  const packageOnly = packageSelected.filter(
    (config) =>
      modeledConfigs.has(baseConfigPath(config)) && !affectedConfigs.has(baseConfigPath(config))
  );
  console.log(
    `Moon Jest ${label} shadow selection: ${moonSelected.length} selected, ${moonOnly.length} Moon-only, ${packageOnly.length} package-only`
  );
}

// Matches on the base path so every shard of an always-run config is restored.
function addAlwaysRunConfigs(
  filtered: string[],
  allConfigs: string[],
  alwaysRun: readonly string[]
): string[] {
  if (alwaysRun.length === 0) {
    return filtered;
  }

  const alwaysRunSet = new Set(alwaysRun);
  const result = new Set(filtered);
  for (const config of allConfigs) {
    if (alwaysRunSet.has(baseConfigPath(config)) && !result.has(config)) {
      result.add(config);
      console.log(`Always-run Jest integration config re-added: ${config}`);
    }
  }
  return [...result];
}

function baseConfigPath(config: string): string {
  const idx = config.indexOf(SHARD_ANNOTATION_SEP);
  return idx === -1 ? config : config.slice(0, idx);
}
