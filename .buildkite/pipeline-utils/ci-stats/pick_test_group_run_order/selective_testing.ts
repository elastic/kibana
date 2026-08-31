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
  getAffectedPackages,
  listChangedFiles,
  touchedCriticalFiles,
} from '../../affected-packages';

import { expandJestImplicitConsumers } from './jest_implicit_consumers';
import { SHARD_ANNOTATION_SEP } from './jest_configs';

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

  const prChangedFiles = listChangedFiles({ mergeBase, commit: 'HEAD' });
  const expandedAffectedPackages = expandJestImplicitConsumers(affectedPackages, prChangedFiles);
  console.log(
    'Filtering Jest unit/integration tests for affected packages:',
    expandedAffectedPackages
  );
  return { affectedPackages: expandedAffectedPackages, prChangedFiles };
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

/** Like the unit filter, but always re-adds ALWAYS_RUN_JEST_INTEGRATION_CONFIGS. */
export function filterJestIntegrationConfigsByAffected(
  jestIntegrationConfigs: string[],
  context: SelectiveTestingContext
): string[] {
  return filterByAffected({
    label: 'integration',
    configs: jestIntegrationConfigs,
    criticalFiles: CRITICAL_FILES_JEST_INTEGRATION_TESTS,
    alwaysRun: ALWAYS_RUN_JEST_INTEGRATION_CONFIGS,
    context,
  });
}

function filterByAffected(args: {
  label: 'unit' | 'integration';
  configs: string[];
  criticalFiles: string[];
  alwaysRun?: readonly string[];
  context: SelectiveTestingContext;
}): string[] {
  const { label, configs, criticalFiles, alwaysRun = [], context } = args;

  if (touchedCriticalFiles(context.prChangedFiles, criticalFiles)) {
    console.log(`Not filtering Jest ${label} tests because critical files changed`);
    return configs;
  }

  const filtered = filterFilesByPackages(configs, context.affectedPackages);
  const withAlwaysRun = addAlwaysRunConfigs(filtered, configs, alwaysRun);
  console.log(`Filtering Jest ${label} tests: ${configs.length} -> ${withAlwaysRun.length}`);
  return withAlwaysRun;
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
