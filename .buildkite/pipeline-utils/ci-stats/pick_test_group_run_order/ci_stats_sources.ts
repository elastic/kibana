/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Fs from 'fs';

import { CI_STATS_DEFAULTS, PIPELINES } from './const';
import type { RunOrderConfig } from './env_config';

type CiStatsSource =
  | { branch: string; jobName: string }
  | { prId: string; jobName: string }
  | { commit: string; jobName: string };

interface CiStatsGroup {
  type: string;
  queue?: string;
  defaultMin?: number;
  maxMin: number;
  tooLongMin?: number;
  minimumIsolationMin?: number;
  overheadMin?: number;
  warmupMin?: number;
  concurrency?: number;
  names: string[];
}

/**
 * Build the prioritized list of historical jobs ci-stats should consult to
 * estimate per-config durations. Order matters: earlier entries win.
 */
export function buildCiStatsSources(args: {
  trackedBranch: string;
  ownBranch: string;
  pipelineSlug: string;
  prNumber: string | undefined;
  prMergeBase: string | undefined;
}): CiStatsSource[] {
  const { trackedBranch, ownBranch, pipelineSlug, prNumber, prMergeBase } = args;

  return [
    // try to get times from a recent successful job on this PR
    ...(prNumber ? [{ prId: prNumber, jobName: PIPELINES.PULL_REQUEST }] : []),
    // if we are running on a external job, like kibana-code-coverage-main, try finding times that are specific to that job
    // kibana-elasticsearch-serverless-verify-and-promote is not necessarily run in commit order -
    // using kibana-on-merge groups will provide a closer approximation, with a failure mode -
    // of too many ftr groups instead of potential timeouts.
    ...(!prNumber &&
    pipelineSlug !== PIPELINES.ON_MERGE &&
    pipelineSlug !== PIPELINES.ES_SERVERLESS_VERIFY
      ? [
          { branch: ownBranch, jobName: pipelineSlug },
          { branch: trackedBranch, jobName: pipelineSlug },
        ]
      : []),
    // try to get times from the mergeBase commit
    ...(prMergeBase ? [{ commit: prMergeBase, jobName: PIPELINES.ON_MERGE }] : []),
    // fallback to the latest times from the tracked branch
    { branch: trackedBranch, jobName: PIPELINES.ON_MERGE },
    // finally fallback to the latest times from the main branch in case this branch is brand new
    { branch: 'main', jobName: PIPELINES.ON_MERGE },
  ];
}

/**
 * Build the test-type groups (unit / integration / functional-by-queue) the
 * ci-stats endpoint partitions into runnable chunks.
 */
export function buildCiStatsGroups(args: {
  jestUnitConfigs: string[];
  jestIntegrationConfigs: string[];
  ftrConfigsByQueue: Map<string, string[]>;
  config: RunOrderConfig;
}): CiStatsGroup[] {
  const { jestUnitConfigs, jestIntegrationConfigs, ftrConfigsByQueue, config } = args;

  return [
    {
      type: config.unitType,
      ...CI_STATS_DEFAULTS.JEST_UNIT,
      maxMin: config.jestUnitMaxMinutes,
      tooLongMin: config.jestUnitTooLongMinutes,
      names: jestUnitConfigs,
    },
    {
      type: config.integrationType,
      ...CI_STATS_DEFAULTS.JEST_INTEGRATION,
      maxMin: config.jestIntegrationMaxMinutes,
      tooLongMin: config.jestIntegrationTooLongMinutes,
      names: jestIntegrationConfigs,
    },
    ...Array.from(ftrConfigsByQueue).map(([queue, names]) => ({
      type: config.functionalType,
      ...CI_STATS_DEFAULTS.FUNCTIONAL,
      queue,
      maxMin: config.functionalMaxMinutes,
      tooLongMin: config.functionalTooLongMinutes,
      minimumIsolationMin: config.functionalMinimumIsolationMin,
      names,
    })),
  ];
}

/**
 * Read the tracked branch from the repo's package.json. ci-stats uses this to
 * find historical durations from the matching long-lived branch.
 */
export function getTrackedBranch(): string {
  let pkg;
  try {
    pkg = JSON.parse(Fs.readFileSync('package.json', 'utf8'));
  } catch (_) {
    const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
    throw new Error(`unable to read kibana's package.json file: ${error.message}`);
  }

  const branch = pkg.branch;
  if (typeof branch !== 'string') {
    throw new Error('missing `branch` field from package.json file');
  }

  return branch;
}
