/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import { expandAgentQueue } from '../agent_images';
import { BuildkiteClient } from '../buildkite';
import { collectEnvFromLabels } from '../pr_labels';
import { getRequiredEnv } from '#pipeline-utils';
import type { ModuleDiscoveryInfo } from './pick_scout_test_group_run_order';
import { getChangedScoutModules } from './get_scout_burn_in_configs';

const DEFAULT_BURN_IN_REPEAT_EACH = 2;
const BURN_IN_LABEL_PREFIX = 'ci:scout-burn-in-repeat-';

/**
 * Parse the repeat-each value from PR labels and environment variables.
 *
 * Priority:
 * 1. `SCOUT_BURN_IN_REPEAT_EACH` env var (explicit override)
 * 2. `ci:scout-burn-in-repeat-N` PR label (e.g., ci:scout-burn-in-repeat-5)
 * 3. Default value (2)
 */
function getRepeatEachValue(): number {
  // Check env var override
  const envValue = process.env.SCOUT_BURN_IN_REPEAT_EACH;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Check PR labels for ci:scout-burn-in-repeat-N pattern
  const prLabels = process.env.GITHUB_PR_LABELS ?? '';
  if (prLabels) {
    const labels = prLabels.split(',');
    for (const label of labels) {
      const trimmed = label.trim();
      if (trimmed.startsWith(BURN_IN_LABEL_PREFIX)) {
        const repeatStr = trimmed.substring(BURN_IN_LABEL_PREFIX.length);
        const parsed = parseInt(repeatStr, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
  }

  return DEFAULT_BURN_IN_REPEAT_EACH;
}

/**
 * Reads the Scout configs JSON, filters to modules affected by PR changes,
 * and uploads Buildkite pipeline steps for burn-in testing.
 *
 * Burn-in steps differ from regular Scout test steps:
 * - They set SCOUT_BURN_IN_REPEAT_EACH to run each test multiple times
 * - They use soft_fail so failures don't block the PR
 * - Automatic retries are disabled (failures should be investigated)
 * - A summary step is generated to aggregate results and post a PR comment
 */
export async function pickScoutBurnInRunOrder(scoutConfigsPath: string) {
  const bk = new BuildkiteClient();
  const envFromLabels: Record<string, string> = collectEnvFromLabels();

  if (!Fs.existsSync(scoutConfigsPath)) {
    throw new Error(`Scout configs file not found at ${scoutConfigsPath}`);
  }

  const allModules = JSON.parse(
    Fs.readFileSync(scoutConfigsPath, 'utf-8')
  ) as ModuleDiscoveryInfo[];

  if (allModules.length === 0) {
    console.error('scout burn-in: No Scout configs found in artifact, skipping burn-in');
    return;
  }

  // Filter to only modules affected by PR changes
  const affectedModules = getChangedScoutModules(allModules);

  if (affectedModules.length === 0) {
    console.error('scout burn-in: No affected modules found, skipping burn-in step generation');
    return;
  }

  const repeatEach = getRepeatEachValue();
  console.error(`scout burn-in: Using repeat-each=${repeatEach}`);

  const burnInSteps = affectedModules.map((module) => {
    const usesParallelWorkers = module.configs.some((config) => config.usesParallelWorkers);

    return {
      label: `Scout Burn-in: [ ${module.group} / ${module.name} ] ${module.type}`,
      key: `burn-in-${module.name}`,
      agents: expandAgentQueue(usesParallelWorkers ? 'n2-8-spot' : 'n2-4-spot'),
      group: module.group,
    };
  });

  // Store the module names in metadata for the summary step
  bk.setMetadata(
    'scout_burn_in_modules',
    affectedModules.map((m) => m.name).join(',')
  );
  bk.setMetadata('scout_burn_in_repeat_each', String(repeatEach));

  // Upload burn-in test steps + summary step
  // Note: soft_fail is a valid Buildkite step property not fully represented
  // in our BuildkiteCommandStep type. The dump() serializer includes all
  // properties regardless of type definitions.
  bk.uploadSteps(
    [
      {
        group: 'Scout Burn-in',
        key: 'scout-burn-in',
        depends_on: ['build_scout_burn_in'],
        steps: [
          // Test execution steps (one per affected module)
          ...burnInSteps.map(({ label, key, group, agents }) => ({
            label,
            command: getRequiredEnv('SCOUT_BURN_IN_CONFIGS_SCRIPT'),
            timeout_in_minutes: 60,
            agents,
            soft_fail: true,
            env: {
              SCOUT_CONFIG_GROUP_KEY: key.replace('burn-in-', ''),
              SCOUT_CONFIG_GROUP_TYPE: group,
              SCOUT_BURN_IN_REPEAT_EACH: String(repeatEach),
              ...envFromLabels,
            },
          })),
          // Summary step: aggregates results and posts a PR comment
          {
            label: 'Scout Burn-in Summary',
            command: getRequiredEnv('SCOUT_BURN_IN_SUMMARY_SCRIPT'),
            timeout_in_minutes: 5,
            agents: expandAgentQueue('n2-4-spot'),
            depends_on: burnInSteps.map(({ key }) => key),
            allow_dependency_failure: true,
            soft_fail: true,
            env: {
              ...envFromLabels,
            },
          },
        ],
      },
    ].flat()
  );
}
