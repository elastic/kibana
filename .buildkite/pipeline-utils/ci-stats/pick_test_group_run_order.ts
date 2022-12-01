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

function getRunGroups(bk: BuildkiteClient, allTypes: RunGroup[], typeName: string): RunGroup[] {
  const types = allTypes.filter((t) => t.type === typeName);
  if (!types.length) {
    throw new Error(`missing test group run order for group [${typeName}]`);
  }

  const misses = types.flatMap((t) => t.namesWithoutDurations);
  if (misses.length > 0) {
    bk.setAnnotation(
      `test-group-missing-durations:${typeName}`,
      'warning',
      [
        misses.length === 1
          ? `The following "${typeName}" config doesn't have a recorded time in ci-stats so the automatically-determined test groups might be a little unbalanced.`
          : `The following "${typeName}" configs don't have recorded times in ci-stats so the automatically-determined test groups might be a little unbalanced.`,
        misses.length === 1
          ? `If this is a new config then this warning can be ignored as times will be reported soon.`
          : `If these are new configs then this warning can be ignored as times will be reported soon.`,
        misses.length === 1
          ? `The other possibility is that there aren't any tests in this config, so times are never reported.`
          : `The other possibility is that there aren't any tests in these configs, so times are never reported.`,
        'Empty test configs should be removed',
        '',
        ...misses.map((n) => ` - ${n}`),
      ].join('\n')
    );
  }

  const tooLongs = types.flatMap((t) => t.tooLong ?? []);
  if (tooLongs.length > 0) {
    bk.setAnnotation(
      `test-group-too-long:${typeName}`,
      'error',
      [
        tooLongs.length === 1
          ? `The following "${typeName}" config has a duration that exceeds the maximum amount of time desired for a single CI job. Please split it up.`
          : `The following "${typeName}" configs have durations that exceed the maximum amount of time desired for a single CI job. Please split them up.`,
        '',
        ...tooLongs.map(({ config, durationMin }) => ` - ${config}: ${durationMin} minutes`),
      ].join('\n')
    );
  }

  return types;
}

function getRunGroup(bk: BuildkiteClient, allTypes: RunGroup[], typeName: string): RunGroup {
  const groups = getRunGroups(bk, allTypes, typeName);
  if (groups.length !== 1) {
    throw new Error(`expected to find exactly 1 "${typeName}" run group`);
  }
  return groups[0];
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
      !configs.enabled.every(
        (p): p is string | { [configPath: string]: { queue: string } } =>
          typeof p === 'string' ||
          (isObj(p) && Object.values(p).every((v) => isObj(v) && typeof v.queue === 'string'))
      )
    ) {
      throw new Error(`expected "enabled" value to be an array of strings or objects shaped as:\n
  - {configPath}:
      queue: {queueName}`);
    }
    if (typeof configs.defaultQueue !== 'string') {
      throw new Error('expected yaml file to have a string "defaultQueue" key');
    }

    const defaultQueue = configs.defaultQueue;
    const ftrConfigsByQueue = new Map<string, string[]>();
    for (const enabled of configs.enabled) {
      const path = typeof enabled === 'string' ? enabled : Object.keys(enabled)[0];
      const queue = isObj(enabled) ? enabled[path].queue : defaultQueue;

      if (patterns && !patterns.some((pattern) => minimatch(path, pattern))) {
        continue;
      }

      const group = ftrConfigsByQueue.get(queue);
      if (group) {
        group.push(path);
      } else {
        ftrConfigsByQueue.set(queue, [path]);
      }
    }

    return { defaultQueue, ftrConfigsByQueue };
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
    : 40;
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

  const { defaultQueue, ftrConfigsByQueue } = getEnabledFtrConfigs(FTR_CONFIG_PATTERNS);
  if (!LIMIT_CONFIG_TYPE.includes('functional')) {
    ftrConfigsByQueue.clear();
  }

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

  if (!ftrConfigsByQueue.size && !jestUnitConfigs.length && !jestIntegrationConfigs.length) {
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
      ...Array.from(ftrConfigsByQueue).map(([queue, names]) => ({
        type: FUNCTIONAL_TYPE,
        defaultMin: 60,
        queue,
        maxMin: FUNCTIONAL_MAX_MINUTES,
        minimumIsolationMin: FUNCTIONAL_MINIMUM_ISOLATION_MIN,
        overheadMin: 1.5,
        names,
      })),
    ],
  });

  console.log('test run order is determined by builds:');
  console.dir(sources, { depth: Infinity, maxArrayLength: Infinity });

  const unit = getRunGroup(bk, types, UNIT_TYPE);
  const integration = getRunGroup(bk, types, INTEGRATION_TYPE);

  let configCounter = 0;
  let groupCounter = 0;

  // the relevant data we will use to define the pipeline steps
  const functionalGroups: Array<{
    title: string;
    key: string;
    sortBy: number | string;
    queue: string;
  }> = [];
  // the map that we will write to the artifacts for informing ftr config jobs of what they should do
  const ftrRunOrder: Record<
    string,
    { title: string; expectedDurationMin: number; names: string[] }
  > = {};

  if (ftrConfigsByQueue.size) {
    for (const { groups, queue } of getRunGroups(bk, types, FUNCTIONAL_TYPE)) {
      for (const group of groups) {
        if (!group.names.length) {
          continue;
        }

        const key = `ftr_configs_${configCounter++}`;
        let sortBy;
        let title;
        if (group.names.length === 1) {
          title = group.names[0];
          sortBy = title;
        } else {
          sortBy = ++groupCounter;
          title = `FTR Configs #${sortBy}`;
        }

        functionalGroups.push({
          title,
          key,
          sortBy,
          queue: queue ?? defaultQueue,
        });
        ftrRunOrder[key] = {
          title,
          expectedDurationMin: group.durationMin,
          names: group.names,
        };
      }
    }
  }

  // write the config for each step to an artifact that can be used by the individual jest jobs
  Fs.writeFileSync('jest_run_order.json', JSON.stringify({ unit, integration }, null, 2));
  bk.uploadArtifacts('jest_run_order.json');

  // write the config for functional steps to an artifact that can be used by the individual functional jobs
  Fs.writeFileSync('ftr_run_order.json', JSON.stringify(ftrRunOrder, null, 2));
  bk.uploadArtifacts('ftr_run_order.json');

  // upload the step definitions to Buildkite
  bk.uploadSteps(
    [
      unit.count > 0
        ? {
            label: 'Jest Tests',
            command: getRequiredEnv('JEST_UNIT_SCRIPT'),
            parallelism: unit.count,
            timeout_in_minutes: 60,
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
            timeout_in_minutes: 60,
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
      functionalGroups.length
        ? {
            group: 'FTR Configs',
            key: 'ftr-configs',
            depends_on: FTR_CONFIGS_DEPS,
            steps: functionalGroups
              .sort((a, b) =>
                // if both groups are sorted by number then sort by that
                typeof a.sortBy === 'number' && typeof b.sortBy === 'number'
                  ? a.sortBy - b.sortBy
                  : // if both groups are sorted by string, sort by that
                  typeof a.sortBy === 'string' && typeof b.sortBy === 'string'
                  ? a.sortBy.localeCompare(b.sortBy)
                  : // if a is sorted by number then order it later than b
                  typeof a.sortBy === 'number'
                  ? 1
                  : -1
              )
              .map(
                ({ title, key, queue = defaultQueue }): BuildkiteStep => ({
                  label: title,
                  command: getRequiredEnv('FTR_CONFIGS_SCRIPT'),
                  timeout_in_minutes: 60,
                  agents: {
                    queue,
                  },
                  env: {
                    FTR_CONFIG_GROUP_KEY: key,
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
              ),
          }
        : [],
    ].flat()
  );
}
