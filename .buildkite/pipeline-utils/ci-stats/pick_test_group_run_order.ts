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

import { BuildkiteClient, BuildkiteGroup, BuildkiteStep } from '../buildkite';
import { CiStatsClient, SourceDescriptor, TestGroupRunOrderResponse } from './client';

import DISABLED_JEST_CONFIGS from '../../disabled_jest_configs.json';
import {
  getAllTestFilesForConfigs,
  getChangedFileList,
  getFloatFromEnv,
  getIntFromEnv,
  getListFromEnv,
  getRequiredEnv,
  getTrackedBranch,
  intersection,
  isObj,
} from './utils';

type RunGroup = TestGroupRunOrderResponse['types'][0];

export async function pickTestGroupRunOrder() {
  const bk = new BuildkiteClient();
  const ciStats = new CiStatsClient();

  // these keys are synchronized in a few placed by storing them in the env during builds
  const UNIT_TYPE = getRequiredEnv('TEST_GROUP_TYPE_UNIT');
  const INTEGRATION_TYPE = getRequiredEnv('TEST_GROUP_TYPE_INTEGRATION');
  const FUNCTIONAL_TYPE = getRequiredEnv('TEST_GROUP_TYPE_FUNCTIONAL');

  /**
   * This env variable corresponds to the env stanza within
   * https://github.com/elastic/kibana/blob/bc2cb5dc613c3d455a5fed9c54450fd7e46ffd92/.buildkite/pipelines/code_coverage/daily.yml#L17
   *
   * It is a flag that signals the job for which test runners will be executed.
   *
   * For example in code coverage pipeline definition, it is "limited"
   * to 'unit,integration'.  This means FTR tests will not be executed.
   */
  const LIMIT_CONFIG_TYPE = getListFromEnv('LIMIT_CONFIG_TYPE', [
    'unit',
    'integration',
    'functional',
  ]);

  const jestUnitConfigs = LIMIT_CONFIG_TYPE.includes('unit')
    ? globby.sync(['**/jest.config.js', '!**/__fixtures__/**'], {
        cwd: process.cwd(),
        absolute: false,
        ignore: DISABLED_JEST_CONFIGS,
      })
    : [];

  const jestIntegrationConfigs = LIMIT_CONFIG_TYPE.includes('integration')
    ? globby.sync(['**/jest.integration.config.js', '!**/__fixtures__/**'], {
        cwd: process.cwd(),
        absolute: false,
        ignore: DISABLED_JEST_CONFIGS,
      })
    : [];

  const { defaultQueue, ftrConfigsByQueue } = getEnabledFtrConfigs();
  const ftrConfigsIncluded = LIMIT_CONFIG_TYPE.includes('functional');
  if (!ftrConfigsIncluded) ftrConfigsByQueue.clear();

  if (!ftrConfigsByQueue.size && !jestUnitConfigs.length && !jestIntegrationConfigs.length) {
    throw new Error('unable to find any unit, integration, or FTR configs');
  }

  const allJestTestFiles = await getAllTestFilesForConfigs(jestUnitConfigs);
  const allChangedFiles = getChangedFileList();
  const changedTestFiles = intersection(allJestTestFiles, allChangedFiles);

  console.log('--- All jest configs listed');
  console.log({
    allJestTestFiles,
    allChangedFiles,
    changedTestFiles,
  });

  throw new Error('STOP HERE!');

  const runOrderConfig = buildRunOrderConfig({
    jestUnitConfigs,
    jestIntegrationConfigs,
    ftrConfigsByQueue,
  });
  const { sources, types } = await ciStats.pickTestGroupRunOrder(runOrderConfig);

  console.log('test run order is determined by builds:');
  console.dir(sources, { depth: Infinity, maxArrayLength: Infinity });

  const unitTestGroup = getRunGroup(bk, types, UNIT_TYPE);
  const integrationTestGroup = getRunGroup(bk, types, INTEGRATION_TYPE);
  const functionalTestGroup = getRunGroups(bk, types, FUNCTIONAL_TYPE);

  const { functionalGroups, ftrRunOrder } = calculateFtrGroupsFromQueues(
    ftrConfigsByQueue,
    functionalTestGroup,
    defaultQueue
  );

  writeAndArchiveRunOrders({
    unitTestGroup,
    integrationTestGroup,
    bk,
    ftrRunOrder,
  });

  // upload the step definitions to Buildkite
  bk.uploadSteps(
    collectBuildkiteTestSteps({
      unitTestGroup,
      integrationTestGroup,
      functionalGroups,
    })
  );
}

function getEnabledFtrConfigs() {
  const patterns = getListFromEnv('FTR_CONFIG_PATTERNS', undefined);

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
      'warning',
      [
        tooLongs.length === 1
          ? `The following "${typeName}" config has a duration that exceeds the maximum amount of time desired for a single CI job. ` +
            `This is not an error, and if you don't own this config then you can ignore this warning. ` +
            `If you own this config please split it up ASAP and ask Operations if you have questions about how to do that.`
          : `The following "${typeName}" configs have durations that exceed the maximum amount of time desired for a single CI job. ` +
            `This is not an error, and if you don't own any of these configs then you can ignore this warning.` +
            `If you own any of these configs please split them up ASAP and ask Operations if you have questions about how to do that.`,
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

function buildRunOrderConfig({
  jestUnitConfigs,
  jestIntegrationConfigs,
  ftrConfigsByQueue,
}: {
  jestUnitConfigs: any;
  jestIntegrationConfigs: any;
  ftrConfigsByQueue: Map<string, string[]>;
}) {
  const UNIT_TYPE = getRequiredEnv('TEST_GROUP_TYPE_UNIT');
  const INTEGRATION_TYPE = getRequiredEnv('TEST_GROUP_TYPE_INTEGRATION');
  const FUNCTIONAL_TYPE = getRequiredEnv('TEST_GROUP_TYPE_FUNCTIONAL');

  const JEST_MAX_MINUTES = getFloatFromEnv('JEST_MAX_MINUTES', 40);
  const FUNCTIONAL_MAX_MINUTES = getFloatFromEnv('FUNCTIONAL_MAX_MINUTES', 37);
  const FUNCTIONAL_MINIMUM_ISOLATION_MIN = getFloatFromEnv(
    'FUNCTIONAL_MINIMUM_ISOLATION_MIN',
    undefined
  );

  const trackedBranch = getTrackedBranch();
  const ownBranch = process.env.BUILDKITE_BRANCH as string;
  const pipelineSlug = process.env.BUILDKITE_PIPELINE_SLUG as string;
  const prNumber = process.env.GITHUB_PR_NUMBER as string | undefined;

  return {
    sources: collectSources({
      prNumber,
      trackedBranch,
      ownBranch,
      pipelineSlug,
    }),
    groups: [
      {
        type: UNIT_TYPE,
        defaultMin: 4,
        maxMin: JEST_MAX_MINUTES,
        overheadMin: 0.2,
        names: jestUnitConfigs,
      },
      {
        type: INTEGRATION_TYPE,
        defaultMin: 60,
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
  };
}

function writeAndArchiveRunOrders({
  unitTestGroup,
  integrationTestGroup,
  bk,
  ftrRunOrder,
}: {
  unitTestGroup: RunGroup;
  integrationTestGroup: RunGroup;
  bk: BuildkiteClient;
  ftrRunOrder: Record<string, { title: string; expectedDurationMin: number; names: string[] }>;
}) {
  // write the config for each step to an artifact that can be used by the individual jest jobs
  Fs.writeFileSync(
    'jest_run_order.json',
    JSON.stringify(
      {
        unit: unitTestGroup,
        integration: integrationTestGroup,
      },
      null,
      2
    )
  );
  bk.uploadArtifacts('jest_run_order.json');

  if (Object.keys(ftrRunOrder).length > 0) {
    // write the config for functional steps to an artifact that can be used by the individual functional jobs
    Fs.writeFileSync('ftr_run_order.json', JSON.stringify(ftrRunOrder, null, 2));
    bk.uploadArtifacts('ftr_run_order.json');
  }
}

function calculateFtrGroupsFromQueues(
  ftrConfigsByQueue: Map<string, string[]>,
  functionalTestGroup: RunGroup[],
  defaultQueue: string
) {
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
    for (const { groups, queue } of functionalTestGroup) {
      for (const group of groups) {
        if (!group.names.length) {
          continue;
        }

        const key = `ftr_configs_${configCounter++}`;

        const { sortBy, title } =
          group.names.length === 1
            ? {
                title: group.names[0],
                sortBy: group.names[0],
              }
            : {
                title: `FTR Configs #${++groupCounter}`,
                sortBy: groupCounter,
              };

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

  return { functionalGroups, ftrRunOrder };
}

function collectBuildkiteTestSteps({
  unitTestGroup,
  integrationTestGroup,
  functionalGroups,
}: {
  unitTestGroup: RunGroup;
  integrationTestGroup: RunGroup;
  functionalGroups: Array<{ title: string; key: string; sortBy: number | string; queue: string }>;
}): Array<BuildkiteStep | BuildkiteGroup> {
  const FTR_CONFIGS_SCRIPT = getRequiredEnv('FTR_CONFIGS_SCRIPT');
  const FTR_CONFIGS_DEPS = getListFromEnv('FTR_CONFIGS_DEPS', ['build']);
  const FTR_CONFIGS_RETRY_COUNT = getIntFromEnv('FTR_CONFIGS_RETRY_COUNT', 1);

  const testSteps = [];

  if (unitTestGroup.count > 0) {
    testSteps.push({
      label: 'Jest Tests',
      command: getRequiredEnv('JEST_UNIT_SCRIPT'),
      parallelism: unitTestGroup.count,
      timeout_in_minutes: 120,
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
    });
  }

  if (integrationTestGroup.count > 0) {
    testSteps.push({
      label: 'Jest Integration Tests',
      command: getRequiredEnv('JEST_INTEGRATION_SCRIPT'),
      parallelism: integrationTestGroup.count,
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
    });
  }

  if (functionalGroups.length) {
    testSteps.push({
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
          ({ title, key, queue }): BuildkiteStep => ({
            label: title,
            command: FTR_CONFIGS_SCRIPT,
            timeout_in_minutes: 90,
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
    });
  }
  return testSteps;
}

function collectSources({
  prNumber,
  trackedBranch,
  ownBranch,
  pipelineSlug,
}: {
  trackedBranch: string;
  ownBranch: string;
  pipelineSlug: string;
  prNumber: string | undefined;
}) {
  const sources: SourceDescriptor[] = [];

  if (prNumber) {
    // try to get times from a recent successful job on this PR
    sources.push({
      prId: prNumber,
      jobName: 'kibana-pull-request',
    });
  }

  if (!prNumber && pipelineSlug !== 'kibana-on-merge') {
    // if we are running on a external job, like kibana-code-coverage-main, try finding times that are specific to that job
    sources.push(
      {
        branch: ownBranch,
        jobName: pipelineSlug,
      },
      {
        branch: trackedBranch,
        jobName: pipelineSlug,
      }
    );
  }

  if (process.env.GITHUB_PR_MERGE_BASE) {
    // try to get times from the mergeBase commit
    sources.push({
      commit: process.env.GITHUB_PR_MERGE_BASE,
      jobName: 'kibana-on-merge',
    });
  }
  sources.push(
    // fallback to the latest times from the tracked branch
    {
      branch: trackedBranch,
      jobName: 'kibana-on-merge',
    },
    // finally fallback to the latest times from the main branch in case this branch is brand new
    {
      branch: 'main',
      jobName: 'kibana-on-merge',
    }
  );

  return sources;
}
