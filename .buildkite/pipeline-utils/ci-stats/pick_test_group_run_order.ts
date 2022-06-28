/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Fs from 'fs';

import * as globby from 'globby';
import minimatch from 'minimatch';
import { load as loadYaml } from 'js-yaml';

import { BuildkiteClient, BuildkiteStep } from '../buildkite';
import { CiStatsClient, TestGroupRunOrderResponse } from './client';

type RunGroup = TestGroupRunOrderResponse['types'][0];

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (typeof value !== 'string' || !value) {
    throw new Error(`Missing required environment variable "${name}"`);
  }
  return value;
};

function getRunGroup(bk: BuildkiteClient, types: RunGroup[], typeName: string): RunGroup {
  const type = types.find((t) => t.type === typeName);
  if (!type) {
    throw new Error(`missing test group run order for group [${typeName}]`);
  }

  const misses = type.namesWithoutDurations.length;
  if (misses > 0) {
    bk.setAnnotation(
      `test-group-missing-durations:${typeName}`,
      'warning',
      [
        misses === 1
          ? `The following "${typeName}" config doesn't have a recorded time in ci-stats so the automatically-determined test groups might be a little unbalanced.`
          : `The following "${typeName}" configs don't have recorded times in ci-stats so the automatically-determined test groups might be a little unbalanced.`,
        misses === 1
          ? `If this is a new config then this warning can be ignored as times will be reported soon.`
          : `If these are new configs then this warning can be ignored as times will be reported soon.`,
        misses === 1
          ? `The other possibility is that there aren't any tests in this config, so times are never reported.`
          : `The other possibility is that there aren't any tests in these configs, so times are never reported.`,
        'Empty test configs should be removed',
        '',
        ...type.namesWithoutDurations.map((n) => ` - ${n}`),
      ].join('\n')
    );
  }

  const tooLongs = type.tooLong?.length ?? 0;
  if (tooLongs > 0) {
    bk.setAnnotation(
      `test-group-too-long:${typeName}`,
      'error',
      [
        tooLongs === 1
          ? `The following "${typeName}" config has a duration that exceeds the maximum amount of time desired for a single CI job. Please split it up.`
          : `The following "${typeName}" configs have durations that exceed the maximum amount of time desired for a single CI job. Please split them up.`,
        '',
        ...(type.tooLong ?? []).map(
          ({ config, durationMin }) => ` - ${config}: ${durationMin} minutes`
        ),
      ].join('\n')
    );
  }

  return type;
}

function getTrackedBranch(): string {
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

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function getEnabledFtrConfigs(patterns?: string[]) {
  try {
    const configs = loadYaml(Fs.readFileSync('.buildkite/ftr_configs.yml', 'utf8'));
    if (!isObj(configs)) {
      throw new Error('expected yaml file to parse to an object');
    }
    if (!configs.enabled) {
      throw new Error('expected yaml file to have an "enabled" key');
    }
    if (
      !Array.isArray(configs.enabled) ||
      !configs.enabled.every((p): p is string => typeof p === 'string')
    ) {
      throw new Error('expected "enabled" value to be an array of strings');
    }

    if (!patterns) {
      return configs.enabled;
    }

    return configs.enabled.filter((path) => patterns.some((pattern) => minimatch(path, pattern)));
  } catch (_) {
    const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
    throw new Error(`unable to parse ftr_configs.yml file: ${error.message}`);
  }
}

export async function pickTestGroupRunOrder() {
  const bk = new BuildkiteClient();
  const ciStats = new CiStatsClient();

  // these keys are synchronized in a few placed by storing them in the env during builds
  const UNIT_TYPE = getRequiredEnv('TEST_GROUP_TYPE_UNIT');
  const INTEGRATION_TYPE = getRequiredEnv('TEST_GROUP_TYPE_INTEGRATION');
  const FUNCTIONAL_TYPE = getRequiredEnv('TEST_GROUP_TYPE_FUNCTIONAL');

  const JEST_MAX_MINUTES = process.env.JEST_MAX_MINUTES
    ? parseFloat(process.env.JEST_MAX_MINUTES)
    : 50;
  if (Number.isNaN(JEST_MAX_MINUTES)) {
    throw new Error(`invalid JEST_MAX_MINUTES: ${process.env.JEST_MAX_MINUTES}`);
  }

  const FUNCTIONAL_MAX_MINUTES = process.env.FUNCTIONAL_MAX_MINUTES
    ? parseFloat(process.env.FUNCTIONAL_MAX_MINUTES)
    : 37;
  if (Number.isNaN(FUNCTIONAL_MAX_MINUTES)) {
    throw new Error(`invalid FUNCTIONAL_MAX_MINUTES: ${process.env.FUNCTIONAL_MAX_MINUTES}`);
  }

  const LIMIT_CONFIG_TYPE = process.env.LIMIT_CONFIG_TYPE
    ? process.env.LIMIT_CONFIG_TYPE.split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : ['unit', 'integration', 'functional'];

  const FTR_CONFIG_PATTERNS = process.env.FTR_CONFIG_PATTERNS
    ? process.env.FTR_CONFIG_PATTERNS.split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  const FUNCTIONAL_MINIMUM_ISOLATION_MIN = process.env.FUNCTIONAL_MINIMUM_ISOLATION_MIN
    ? parseFloat(process.env.FUNCTIONAL_MINIMUM_ISOLATION_MIN)
    : undefined;
  if (
    FUNCTIONAL_MINIMUM_ISOLATION_MIN !== undefined &&
    Number.isNaN(FUNCTIONAL_MINIMUM_ISOLATION_MIN)
  ) {
    throw new Error(
      `invalid FUNCTIONAL_MINIMUM_ISOLATION_MIN: ${process.env.FUNCTIONAL_MINIMUM_ISOLATION_MIN}`
    );
  }

  const FTR_CONFIGS_RETRY_COUNT = process.env.FTR_CONFIGS_RETRY_COUNT
    ? parseInt(process.env.FTR_CONFIGS_RETRY_COUNT, 10)
    : 1;
  if (Number.isNaN(FTR_CONFIGS_RETRY_COUNT)) {
    throw new Error(`invalid FTR_CONFIGS_RETRY_COUNT: ${process.env.FTR_CONFIGS_RETRY_COUNT}`);
  }

  const FTR_CONFIGS_DEPS =
    process.env.FTR_CONFIGS_DEPS !== undefined
      ? process.env.FTR_CONFIGS_DEPS.split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : ['build'];

  const ftrConfigs = LIMIT_CONFIG_TYPE.includes('functional')
    ? getEnabledFtrConfigs(FTR_CONFIG_PATTERNS)
    : [];

  const jestUnitConfigs = LIMIT_CONFIG_TYPE.includes('unit')
    ? globby.sync(['**/jest.config.js', '!**/__fixtures__/**'], {
        cwd: process.cwd(),
        absolute: false,
      })
    : [];

  const jestIntegrationConfigs = LIMIT_CONFIG_TYPE.includes('integration')
    ? globby.sync(['**/jest.integration.config.js', '!**/__fixtures__/**'], {
        cwd: process.cwd(),
        absolute: false,
      })
    : [];

  if (!ftrConfigs.length && !jestUnitConfigs.length && !jestIntegrationConfigs.length) {
    throw new Error('unable to find any unit, integration, or FTR configs');
  }

  const trackedBranch = getTrackedBranch();
  const ownBranch = process.env.BUILDKITE_BRANCH as string;
  const pipelineSlug = process.env.BUILDKITE_PIPELINE_SLUG as string;
  const prNumber = process.env.GITHUB_PR_NUMBER as string | undefined;

  const { sources, types } = await ciStats.pickTestGroupRunOrder({
    sources: [
      // try to get times from a recent successful job on this PR
      ...(prNumber
        ? [
            {
              prId: prNumber,
              jobName: 'kibana-pull-request',
            },
          ]
        : []),
      // if we are running on a external job, like kibana-code-coverage-main, try finding times that are specific to that job
      ...(!prNumber && pipelineSlug !== 'kibana-on-merge'
        ? [
            {
              branch: ownBranch,
              jobName: pipelineSlug,
            },
            {
              branch: trackedBranch,
              jobName: pipelineSlug,
            },
          ]
        : []),
      // try to get times from the mergeBase commit
      ...(process.env.GITHUB_PR_MERGE_BASE
        ? [
            {
              commit: process.env.GITHUB_PR_MERGE_BASE,
              jobName: 'kibana-on-merge',
            },
          ]
        : []),
      // fallback to the latest times from the tracked branch
      {
        branch: trackedBranch,
        jobName: 'kibana-on-merge',
      },
      // finally fallback to the latest times from the main branch in case this branch is brand new
      {
        branch: 'main',
        jobName: 'kibana-on-merge',
      },
    ],
    groups: [
      {
        type: UNIT_TYPE,
        defaultMin: 3,
        maxMin: JEST_MAX_MINUTES,
        overheadMin: 0.2,
        names: jestUnitConfigs,
      },
      {
        type: INTEGRATION_TYPE,
        defaultMin: 10,
        maxMin: JEST_MAX_MINUTES,
        overheadMin: 0.2,
        names: jestIntegrationConfigs,
      },
      {
        type: FUNCTIONAL_TYPE,
        defaultMin: 60,
        maxMin: FUNCTIONAL_MAX_MINUTES,
        minimumIsolationMin: FUNCTIONAL_MINIMUM_ISOLATION_MIN,
        overheadMin: 1.5,
        names: ftrConfigs,
      },
    ],
  });

  console.log('test run order is determined by builds:');
  console.dir(sources, { depth: Infinity, maxArrayLength: Infinity });

  const unit = getRunGroup(bk, types, UNIT_TYPE);
  const integration = getRunGroup(bk, types, INTEGRATION_TYPE);
  const functional = getRunGroup(bk, types, FUNCTIONAL_TYPE);

  // write the config for each step to an artifact that can be used by the individual jest jobs
  Fs.writeFileSync('jest_run_order.json', JSON.stringify({ unit, integration }, null, 2));
  bk.uploadArtifacts('jest_run_order.json');

  // write the config for functional steps to an artifact that can be used by the individual functional jobs
  Fs.writeFileSync('ftr_run_order.json', JSON.stringify(functional, null, 2));
  bk.uploadArtifacts('ftr_run_order.json');

  let smallFtrConfigsCounter = 0;
  const getSmallFtrConfigsLabel = () => {
    return `Super Quick FTR Configs #${++smallFtrConfigsCounter}`;
  };

  // upload the step definitions to Buildkite
  bk.uploadSteps(
    [
      unit.count > 0
        ? {
            label: 'Jest Tests',
            command: getRequiredEnv('JEST_UNIT_SCRIPT'),
            parallelism: unit.count,
            timeout_in_minutes: 90,
            key: 'jest',
            agents: {
              queue: 'n2-4-spot',
            },
            retry: {
              automatic: [
                {
                  exit_status: '-1',
                  limit: 3,
                },
              ],
            },
          }
        : [],
      integration.count > 0
        ? {
            label: 'Jest Integration Tests',
            command: getRequiredEnv('JEST_INTEGRATION_SCRIPT'),
            parallelism: integration.count,
            timeout_in_minutes: 120,
            key: 'jest-integration',
            agents: {
              queue: 'n2-4-spot',
            },
            retry: {
              automatic: [
                {
                  exit_status: '-1',
                  limit: 3,
                },
              ],
            },
          }
        : [],
      functional.count > 0
        ? FUNCTIONAL_MINIMUM_ISOLATION_MIN === undefined
          ? {
              label: 'FTR Configs',
              key: 'ftr-configs',
              depends_on: FTR_CONFIGS_DEPS,
              parallelism: functional.count,
              command: getRequiredEnv('FTR_CONFIGS_SCRIPT'),
              timeout_in_minutes: 150,
              agents: {
                queue: 'n2-4-spot-2',
              },
              retry: {
                automatic: [
                  { exit_status: '-1', limit: 3 },
                  ...(FTR_CONFIGS_RETRY_COUNT > 0
                    ? [{ exit_status: '*', limit: FTR_CONFIGS_RETRY_COUNT }]
                    : []),
                ],
              },
            }
          : {
              group: 'FTR Configs',
              key: 'ftr-configs',
              depends_on: FTR_CONFIGS_DEPS,
              steps: functional.groups
                .map(
                  (group, i): BuildkiteStep => ({
                    label: group.names.length === 1 ? group.names[0] : getSmallFtrConfigsLabel(),
                    command: getRequiredEnv('FTR_CONFIGS_SCRIPT'),
                    timeout_in_minutes: 150,
                    agents: {
                      queue: 'n2-4-spot-2',
                    },
                    env: {
                      FTR_CONFIG_GROUP_INDEX: `${i}`,
                    },
                    retry: {
                      automatic: [
                        { exit_status: '-1', limit: 3 },
                        ...(FTR_CONFIGS_RETRY_COUNT > 0
                          ? [{ exit_status: '*', limit: FTR_CONFIGS_RETRY_COUNT }]
                          : []),
                      ],
                    },
                  })
                )
                .sort((a, b) => a.label.localeCompare(b.label)),
            }
        : [],
    ].flat()
  );
}
