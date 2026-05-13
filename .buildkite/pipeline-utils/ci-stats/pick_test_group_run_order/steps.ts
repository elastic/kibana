/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildkiteClient, BuildkiteGroupStep, BuildkiteStep } from '../../buildkite';
import { AGENT_DISK_GIB, RETRIES, STEP_KEYS, TEST_STEP_TIMEOUT_MINUTES } from './const';
import type { FunctionalGroup } from './types';
import { expandAgentQueue } from '#pipeline-utils';

interface JestStepOptions {
  command: string;
  label: string;
  parallelism: number;
  key: 'jest' | 'jest-integration';
  agentDiskSize: number;
  envFromLabels: Record<string, string>;
  dependsOn: string[];
  retryCount: number;
}

/**
 * Build a Buildkite step for the unit or integration jest jobs. Returns
 * `undefined` when there are no parallel slots so the caller can omit it.
 */
export function buildJestStep(opts: JestStepOptions): BuildkiteStep | undefined {
  if (opts.parallelism <= 0) return undefined;

  return {
    label: opts.label,
    command: opts.command,
    parallelism: opts.parallelism,
    timeout_in_minutes: TEST_STEP_TIMEOUT_MINUTES,
    key: opts.key,
    agents: expandAgentQueue('n2-4-spot', opts.agentDiskSize),
    env: opts.envFromLabels,
    depends_on: opts.dependsOn,
    retry: {
      automatic: [
        { exit_status: '-1', limit: RETRIES.INFRA },
        ...(opts.retryCount > 0 ? [{ exit_status: '*', limit: opts.retryCount }] : []),
      ],
    },
  };
}

interface FunctionalStepGroupOptions {
  command: string;
  functionalGroups: FunctionalGroup[];
  defaultQueue: string;
  ftrExtraArgs: Record<string, string>;
  envFromLabels: Record<string, string>;
  dependsOn: string[];
  retryCount: number;
}

/**
 * Build the FTR Configs step group from the resolved functional groups.
 * Returns `undefined` when there are no functional groups.
 */
export function buildFunctionalStepGroup(
  opts: FunctionalStepGroupOptions
): BuildkiteGroupStep | undefined {
  if (opts.functionalGroups.length === 0) return undefined;

  return {
    group: 'FTR Configs',
    key: STEP_KEYS.FTR_GROUP,
    depends_on: opts.dependsOn,
    steps: sortFunctionalGroups(opts.functionalGroups).map(
      ({ title, key, queue = opts.defaultQueue }): BuildkiteStep => ({
        label: title,
        command: opts.command,
        timeout_in_minutes: TEST_STEP_TIMEOUT_MINUTES,
        key,
        agents: expandAgentQueue(queue, AGENT_DISK_GIB.FTR),
        env: {
          FTR_CONFIG_GROUP_KEY: key,
          ...opts.ftrExtraArgs,
          ...opts.envFromLabels,
        },
        retry: {
          automatic: [
            { exit_status: '-1', limit: RETRIES.INFRA },
            ...(opts.retryCount > 0 ? [{ exit_status: '*', limit: opts.retryCount }] : []),
          ],
        },
      })
    ),
  };
}

/**
 * Sort rule (preserved from original):
 * - both numeric → ascending numeric
 * - both string  → locale-compare
 * - numeric vs string → string first (numeric placed later)
 */
export function sortFunctionalGroups(groups: FunctionalGroup[]): FunctionalGroup[] {
  return [...groups].sort((a, b) =>
    typeof a.sortBy === 'number' && typeof b.sortBy === 'number'
      ? a.sortBy - b.sortBy
      : typeof a.sortBy === 'string' && typeof b.sortBy === 'string'
      ? a.sortBy.localeCompare(b.sortBy)
      : typeof a.sortBy === 'number'
      ? 1
      : -1
  );
}

/**
 * Register cancelable child step keys before uploading so a concurrent gate
 * failure can discover and short-circuit these jobs immediately. Child step
 * keys (not group keys) are registered because `buildkite-agent step cancel`
 * does not work on group keys.
 */
export function registerCancelKeys(
  bk: BuildkiteClient,
  args: { unitCount: number; integrationCount: number; functionalGroups: FunctionalGroup[] }
): void {
  const cancelKeys: string[] = [];
  if (args.unitCount > 0) cancelKeys.push(STEP_KEYS.JEST_UNIT);
  if (args.integrationCount > 0) cancelKeys.push(STEP_KEYS.JEST_INTEGRATION);
  for (const fg of args.functionalGroups) cancelKeys.push(fg.key);
  bk.setMetadata('cancel_on_gate_failure_batch:test_groups', JSON.stringify(cancelKeys));
}
