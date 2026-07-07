/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Fs from 'fs';

import type { BuildkiteStep } from '../../buildkite';
import { BuildkiteClient } from '../../buildkite';
import { getTrackedBranch } from '../../utils';
import { CiStatsClient } from '../client';

import { buildCiStatsGroups, buildCiStatsSources } from './ci_stats_sources';
import { AGENT_DISK_GIB, DURATION_PERCENTILE, STEP_KEYS } from './const';
import { loadRunOrderConfig } from './env_config';
import { getEnabledFtrConfigs } from './ftr_manifests';
import { discoverJestIntegrationConfigs, discoverJestUnitConfigs } from './jest_configs';
import { getRunGroup, getRunGroups, labelJestSubgroups } from './run_groups';
import {
  filterJestIntegrationConfigsByAffected,
  filterJestUnitConfigsByAffected,
  resolveSelectiveTestingContext,
} from './selective_testing';
import { buildFunctionalStepGroup, buildJestStep, registerCancelKeys } from './steps';
import type { FtrRunOrder, FunctionalGroup } from './types';

/**
 * Orchestrates the per-build test group sizing for Buildkite:
 *  1. read env into a typed config
 *  2. discover ftr manifests + jest configs (with optional selective filter)
 *  3. ask ci-stats how many parallel slots each test type needs
 *  4. annotate any warnings, write run-order artifacts
 *  5. upload the unit / integration / ftr Buildkite steps
 */
export async function pickTestGroupRunOrder() {
  const bk = new BuildkiteClient();
  const ciStats = new CiStatsClient();
  const config = loadRunOrderConfig();

  const unitIncluded = config.limitConfigType.includes('unit');
  const integrationIncluded = config.limitConfigType.includes('integration');
  const ftrConfigsIncluded = config.limitConfigType.includes('functional');

  let jestUnitConfigs = unitIncluded ? discoverJestUnitConfigs(config.limitSolutions) : [];
  let jestIntegrationConfigs = integrationIncluded
    ? discoverJestIntegrationConfigs(config.limitSolutions)
    : [];
  const { defaultQueue, ftrConfigsByQueue } = getEnabledFtrConfigs(
    config.ftrConfigPatterns,
    config.limitSolutions
  );
  if (!ftrConfigsIncluded) ftrConfigsByQueue.clear();

  if (config.useSelectiveTesting && config.prMergeBase) {
    const selectiveCtx = await resolveSelectiveTestingContext(config.prMergeBase);
    if (selectiveCtx !== null) {
      jestUnitConfigs = filterJestUnitConfigsByAffected(jestUnitConfigs, selectiveCtx);
      jestIntegrationConfigs = filterJestIntegrationConfigsByAffected(
        jestIntegrationConfigs,
        selectiveCtx
      );
    }
  }

  if (!ftrConfigsByQueue.size && !jestUnitConfigs.length && !jestIntegrationConfigs.length) {
    throw new Error('unable to find any unit, integration, or FTR configs');
  }

  const trackedBranch = getTrackedBranch();
  const { sources, types } = await ciStats.pickTestGroupRunOrder({
    durationPercentile: DURATION_PERCENTILE,
    sources: buildCiStatsSources({
      trackedBranch,
      ownBranch: config.ownBranch,
      pipelineSlug: config.pipelineSlug,
      prNumber: config.prNumber,
      prMergeBase: config.prMergeBase,
    }),
    groups: buildCiStatsGroups({
      jestUnitConfigs,
      jestIntegrationConfigs,
      ftrConfigsByQueue,
      config,
    }),
  });

  console.log('test run order is determined by builds:');
  console.dir(sources, { depth: Infinity, maxArrayLength: Infinity });

  const unit = getRunGroup(bk, types, config.unitType);
  const integration = getRunGroup(bk, types, config.integrationType);
  labelJestSubgroups(unit, config.unitType);
  labelJestSubgroups(integration, config.integrationType);

  const { functionalGroups, ftrRunOrder } = ftrConfigsByQueue.size
    ? collectFunctionalGroups(getRunGroups(bk, types, config.functionalType), defaultQueue)
    : { functionalGroups: [], ftrRunOrder: {} };

  Fs.writeFileSync('jest_run_order.json', JSON.stringify({ unit, integration }, null, 2));
  bk.uploadArtifacts('jest_run_order.json');

  if (ftrConfigsIncluded) {
    Fs.writeFileSync('ftr_run_order.json', JSON.stringify(ftrRunOrder, null, 2));
    bk.uploadArtifacts('ftr_run_order.json');
  }

  const steps: BuildkiteStep[] = [
    unit.count > 0 &&
      buildJestStep({
        command: requireVariable(config.jestUnitScript, 'JEST_UNIT_SCRIPT'),
        label: 'Jest Tests',
        parallelism: unit.count,
        key: STEP_KEYS.JEST_UNIT,
        agentDiskSize: AGENT_DISK_GIB.JEST_UNIT,
        envFromLabels: config.envFromLabels,
        dependsOn: config.jestConfigsDeps,
        retryCount: config.jestConfigsRetryCount,
      }),
    integration.count > 0 &&
      buildJestStep({
        command: requireVariable(config.jestIntegrationScript, 'JEST_INTEGRATION_SCRIPT'),
        label: 'Jest Integration Tests',
        parallelism: integration.count,
        key: STEP_KEYS.JEST_INTEGRATION,
        agentDiskSize: AGENT_DISK_GIB.JEST_INTEGRATION,
        envFromLabels: config.envFromLabels,
        dependsOn: config.jestConfigsDeps,
        retryCount: config.jestConfigsRetryCount,
      }),
    functionalGroups.length > 0 &&
      buildFunctionalStepGroup({
        command: requireVariable(config.ftrConfigsScript, 'FTR_CONFIGS_SCRIPT'),
        functionalGroups,
        defaultQueue,
        ftrExtraArgs: config.ftrExtraArgs,
        envFromLabels: config.envFromLabels,
        dependsOn: config.ftrConfigsDeps,
        retryCount: config.ftrConfigsRetryCount,
      }),
  ].filter((s): s is BuildkiteStep => Boolean(s));

  registerCancelKeys(bk, {
    unitCount: unit.count,
    integrationCount: integration.count,
    functionalGroups,
  });

  bk.uploadSteps(steps);
}

/**
 * Throws an error if the variable's value is missing at runtime.
 */
function requireVariable(value: string | undefined, envName: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable "${envName}"`);
  }
  return value;
}

/**
 * Walk the ci-stats functional groups and assign each a stable Buildkite key,
 * deriving the step title from a single-config name or a sequential counter.
 * Also returns the artifact map consumed by individual ftr-config jobs.
 */
function collectFunctionalGroups(
  ftrTypes: ReturnType<typeof getRunGroups>,
  defaultQueue: string
): { functionalGroups: FunctionalGroup[]; ftrRunOrder: FtrRunOrder } {
  const functionalGroups: FunctionalGroup[] = [];
  const ftrRunOrder: FtrRunOrder = {};

  let configCounter = 0;
  let groupCounter = 0;

  for (const { groups, queue } of ftrTypes) {
    for (const group of groups) {
      if (!group.names.length) continue;

      const key = `ftr_configs_${configCounter++}`;
      const isSingle = group.names.length === 1;
      const sortBy = isSingle ? group.names[0] : ++groupCounter;
      const title = isSingle ? group.names[0] : `FTR Configs #${sortBy}`;

      functionalGroups.push({ title, key, sortBy, queue: queue ?? defaultQueue });
      ftrRunOrder[key] = {
        title,
        expectedDurationMin: group.durationMin,
        names: group.names,
      };
    }
  }

  return { functionalGroups, ftrRunOrder };
}
