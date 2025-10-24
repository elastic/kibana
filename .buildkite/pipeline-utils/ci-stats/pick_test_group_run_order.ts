/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Fs from 'fs';

import * as globby from 'globby';
import minimatch from 'minimatch';
import execa from 'execa';

import { load as loadYaml } from 'js-yaml';

import type { BuildkiteStep } from '../buildkite';
import { BuildkiteClient } from '../buildkite';
import type {
  TestGroupRunOrderResponse,
  PickTestGroupRunOrderRequest,
  PickTestGroupRunOrderGroup,
} from './client';
import { CiStatsClient } from './client';

import DISABLED_JEST_CONFIGS from '../../disabled_jest_configs.json';
import { serverless, stateful } from '../../ftr_configs_manifests.json';
import { collectEnvFromLabels, expandAgentQueue } from '#pipeline-utils';

const ALL_FTR_MANIFEST_REL_PATHS = serverless.concat(stateful);

type RunGroup = TestGroupRunOrderResponse['types'][0];

interface ScheduleMachineOptions {
  name: string;
  cpus: number;
  memoryMb: number;
}

interface ScheduleConfigInput {
  path: string;
  testDurationMins: number;
}

interface ScheduleConfigOutput extends ScheduleConfigInput {
  tooLong: boolean;
}

interface ScheduleGroup {
  configs: ScheduleConfigOutput[];
  machine: ScheduleMachineOptions;
  expectedDurationMins: number;
}

interface ScheduleResponse {
  groups: ScheduleGroup[];
}

const MEMORY_PER_CPU_MB_BY_PROFILE: Record<string, number> = {
  standard: 4 * 1024,
  highmem: 8 * 1024,
  highcpu: 1 * 1024,
};

const CONFIG_DURATION_REQUEST_CONCURRENCY = 10;

function createMachineDefinition(machineType: string): ScheduleMachineOptions {
  if (!machineType) {
    throw new Error('Machine type must be provided');
  }

  const machineTokens = machineType.split('-');
  const cpuToken = machineTokens.at(-1);

  if (!cpuToken) {
    throw new Error(`Unable to parse CPU count from machine type "${machineType}"`);
  }

  const cpuCount = Number(cpuToken);

  if (!Number.isFinite(cpuCount) || cpuCount <= 0) {
    throw new Error(`Invalid CPU count parsed from machine type "${machineType}"`);
  }

  const profileToken = machineTokens.length >= 2 ? machineTokens.at(-2) ?? 'standard' : 'standard';
  const memoryPerCpu =
    MEMORY_PER_CPU_MB_BY_PROFILE[profileToken ?? 'standard'] ??
    MEMORY_PER_CPU_MB_BY_PROFILE.standard;

  return {
    name: machineType,
    cpus: cpuCount,
    memoryMb: cpuCount * memoryPerCpu,
  };
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = currentIndex++;
      if (index >= items.length) {
        break;
      }

      results[index] = await task(items[index]);
    }
  });

  await Promise.all(workers);

  return results;
}

async function buildScheduleInputs(
  runGroup: RunGroup,
  fallbackDurationMinutes: number,
  options: {
    ciStats: CiStatsClient;
    sources: PickTestGroupRunOrderRequest['sources'];
    groupTemplate: Omit<PickTestGroupRunOrderGroup, 'names'>;
    durationCache: Map<string, number>;
  }
): Promise<ScheduleConfigInput[]> {
  const sanitizedFallback = Math.max(fallbackDurationMinutes, 1);
  const configNames = new Set<string>();

  for (const group of runGroup.groups) {
    for (const name of group.names) {
      configNames.add(name);
    }
  }

  const configsToFetch = Array.from(configNames).filter((name) => !options.durationCache.has(name));

  if (configsToFetch.length > 0) {
    const fetchResults = await mapWithConcurrency(
      configsToFetch,
      CONFIG_DURATION_REQUEST_CONCURRENCY,
      async (configName) => {
        try {
          const { types } = await options.ciStats.pickTestGroupRunOrder({
            sources: options.sources,
            groups: [
              {
                ...options.groupTemplate,
                names: [configName],
              },
            ],
          });

          const targetType = types.find(
            (typeResult) => typeResult.type === options.groupTemplate.type
          );
          const configGroup = targetType?.groups?.[0];
          const durationMin = configGroup?.durationMin;

          const sanitizedDuration =
            typeof durationMin === 'number' && durationMin > 0 ? durationMin : sanitizedFallback;

          return { configName, duration: sanitizedDuration };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.warn(
            `Unable to retrieve ci-stats duration for config "${configName}": ${err.message}`
          );
          return { configName, duration: sanitizedFallback };
        }
      }
    );

    for (const { configName, duration } of fetchResults) {
      options.durationCache.set(configName, duration);
    }
  }

  return Array.from(configNames).map((name) => ({
    path: name,
    testDurationMins: options.durationCache.get(name) ?? sanitizedFallback,
  }));
}

async function runScheduleScript(options: {
  configs: ScheduleConfigInput[];
  maxDurationMins: number;
  machines: ScheduleMachineOptions[];
}): Promise<ScheduleResponse> {
  const payload = JSON.stringify(options);
  const { stdout } = await execa(
    'node',
    ['--no-warnings', 'scripts/functional_test_schedule.js', `--options=${payload}`],
    {
      cwd: process.cwd(),
      stdio: 'pipe',
    }
  );

  const trimmedOutput = stdout.trim();

  if (!trimmedOutput) {
    throw new Error('Scheduling script produced no output');
  }

  return JSON.parse(trimmedOutput) as ScheduleResponse;
}

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

interface FtrConfigsManifest {
  defaultQueue?: string;
  disabled?: string[];
  enabled?: Array<string | { [configPath: string]: { queue: string } }>;
}

function getEnabledFtrConfigs(patterns?: string[], solutions?: string[]) {
  const configs: {
    enabled: Array<string | { [configPath: string]: { queue: string } }>;
    defaultQueue: string | undefined;
  } = { enabled: [], defaultQueue: undefined };
  const uniqueQueues = new Set<string>();

  const mappedSolutions = solutions?.map((s) => (s === 'observability' ? 'oblt' : s));
  for (const manifestRelPath of ALL_FTR_MANIFEST_REL_PATHS) {
    if (
      mappedSolutions &&
      !(
        mappedSolutions.some((s) => manifestRelPath.includes(`ftr_${s}_`)) ||
        // When applying the solution filter, still allow platform tests
        manifestRelPath.includes('ftr_platform_') ||
        manifestRelPath.includes('ftr_base_')
      )
    ) {
      continue;
    }
    try {
      const ymlData = loadYaml(Fs.readFileSync(manifestRelPath, 'utf8'));
      if (!isObj(ymlData)) {
        throw new Error('expected yaml file to parse to an object');
      }
      const manifest = ymlData as FtrConfigsManifest;

      configs.enabled.push(...(manifest?.enabled ?? []));
      if (manifest.defaultQueue) {
        uniqueQueues.add(manifest.defaultQueue);
      }
    } catch (_) {
      const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
      throw new Error(`unable to parse ${manifestRelPath} file: ${error.message}`);
    }
  }

  try {
    if (configs.enabled.length === 0) {
      throw new Error('expected yaml files to have at least 1 "enabled" key');
    }
    if (uniqueQueues.size !== 1) {
      throw Error(
        `FTR manifest yml files should define the same 'defaultQueue', but found different ones: ${[
          ...uniqueQueues,
        ].join(' ')}`
      );
    }
    configs.defaultQueue = uniqueQueues.values().next().value;

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
    throw new Error(`unable to collect enabled FTR configs: ${error.message}`);
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
    : 25;
  if (Number.isNaN(FUNCTIONAL_MAX_MINUTES)) {
    throw new Error(`invalid FUNCTIONAL_MAX_MINUTES: ${process.env.FUNCTIONAL_MAX_MINUTES}`);
  }

  const FUNCTIONAL_PARALLELISM = 2;

  /**
   * This env variable corresponds to the env stanza within
   * https://github.com/elastic/kibana/blob/bc2cb5dc613c3d455a5fed9c54450fd7e46ffd92/.buildkite/pipelines/code_coverage/daily.yml#L17
   *
   * It is a flag that signals the job for which test runners will be executed.
   *
   * For example in code coverage pipeline definition, it is "limited"
   * to 'unit,integration'.  This means FTR tests will not be executed.
   */
  const LIMIT_CONFIG_TYPE = process.env.LIMIT_CONFIG_TYPE
    ? process.env.LIMIT_CONFIG_TYPE.split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : ['unit', 'integration', 'functional'];

  const LIMIT_SOLUTIONS = process.env.LIMIT_SOLUTIONS
    ? process.env.LIMIT_SOLUTIONS.split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  if (LIMIT_SOLUTIONS) {
    const validSolutions = ['observability', 'search', 'security', 'workplace_ai'];
    const invalidSolutions = LIMIT_SOLUTIONS.filter((s) => !validSolutions.includes(s));
    if (invalidSolutions.length) throw new Error('Unsupported LIMIT_SOLUTIONS value');
  }

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
  const JEST_CONFIGS_RETRY_COUNT = process.env.JEST_CONFIGS_RETRY_COUNT
    ? parseInt(process.env.JEST_CONFIGS_RETRY_COUNT, 10)
    : 1;
  if (Number.isNaN(JEST_CONFIGS_RETRY_COUNT)) {
    throw new Error(`invalid JEST_CONFIGS_RETRY_COUNT: ${process.env.JEST_CONFIGS_RETRY_COUNT}`);
  }

  const FTR_CONFIGS_DEPS =
    process.env.FTR_CONFIGS_DEPS !== undefined
      ? process.env.FTR_CONFIGS_DEPS.split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : ['build'];

  const ftrExtraArgs: Record<string, string> = process.env.FTR_EXTRA_ARGS
    ? { FTR_EXTRA_ARGS: process.env.FTR_EXTRA_ARGS }
    : {};
  const envFromlabels: Record<string, string> = collectEnvFromLabels();

  const { defaultQueue, ftrConfigsByQueue } = getEnabledFtrConfigs(
    FTR_CONFIG_PATTERNS,
    LIMIT_SOLUTIONS
  );

  const ftrConfigsIncluded = LIMIT_CONFIG_TYPE.includes('functional');

  if (!ftrConfigsIncluded) ftrConfigsByQueue.clear();

  const getJestConfigGlobs = (patterns: string[]) => {
    if (!LIMIT_SOLUTIONS) {
      return patterns;
    }

    const platformPatterns = ['src/', 'x-pack/platform/'].flatMap((platformPrefix: string) =>
      patterns.map((pattern: string) => `${platformPrefix}${pattern}`)
    );

    return (
      LIMIT_SOLUTIONS.flatMap((solution: string) =>
        patterns.map((p: string) => `x-pack/solutions/${solution}/${p}`)
      )
        // When applying the solution filter, still allow platform tests
        .concat(platformPatterns)
    );
  };

  const jestUnitConfigs = LIMIT_CONFIG_TYPE.includes('unit')
    ? globby.sync(getJestConfigGlobs(['**/jest.config.js', '!**/__fixtures__/**']), {
        cwd: process.cwd(),
        absolute: false,
        ignore: [...DISABLED_JEST_CONFIGS, '**/node_modules/**'],
      })
    : [];

  const jestIntegrationConfigs = LIMIT_CONFIG_TYPE.includes('integration')
    ? globby.sync(getJestConfigGlobs(['**/jest.integration.config.*js', '!**/__fixtures__/**']), {
        cwd: process.cwd(),
        absolute: false,
        ignore: [...DISABLED_JEST_CONFIGS, '**/node_modules/**'],
      })
    : [];

  if (!ftrConfigsByQueue.size && !jestUnitConfigs.length && !jestIntegrationConfigs.length) {
    throw new Error('unable to find any unit, integration, or FTR configs');
  }

  const trackedBranch = getTrackedBranch();
  const ownBranch = process.env.BUILDKITE_BRANCH as string;
  const pipelineSlug = process.env.BUILDKITE_PIPELINE_SLUG as string;
  const prNumber = process.env.GITHUB_PR_NUMBER as string | undefined;

  const pickRequestSources: PickTestGroupRunOrderRequest['sources'] = [
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
    // kibana-elasticsearch-serverless-verify-and-promote is not necessarily run in commit order -
    // using kibana-on-merge groups will provide a closer approximation, with a failure mode -
    // of too many ftr groups instead of potential timeouts.
    ...(!prNumber &&
    pipelineSlug !== 'kibana-on-merge' &&
    pipelineSlug !== 'kibana-elasticsearch-serverless-verify-and-promote'
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
  ];

  const pickRequestGroups: PickTestGroupRunOrderGroup[] = [
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
    ...Array.from(ftrConfigsByQueue).map<PickTestGroupRunOrderGroup>(([queue, names]) => ({
      type: FUNCTIONAL_TYPE,
      defaultMin: 60,
      queue,
      maxMin: FUNCTIONAL_MAX_MINUTES * FUNCTIONAL_PARALLELISM,
      minimumIsolationMin: FUNCTIONAL_MINIMUM_ISOLATION_MIN,
      overheadMin: 1.5,
      names,
    })),
  ];

  const { sources, types } = await ciStats.pickTestGroupRunOrder({
    sources: pickRequestSources,
    groups: pickRequestGroups,
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
    { title: string; expectedDurationMins: number; names: string[] }
  > = {};

  if (ftrConfigsByQueue.size) {
    const functionalRunGroups = getRunGroups(bk, types, FUNCTIONAL_TYPE);
    const ciStatsFunctionalTooLongs = new Set<string>();
    const scheduledTooLong: Array<{ config: string; durationMin: number }> = [];
    const configDurationCache = new Map<string, number>();

    for (const runGroup of functionalRunGroups) {
      runGroup.tooLong?.forEach(({ config }) => ciStatsFunctionalTooLongs.add(config));

      const resolvedQueue = runGroup.queue ?? defaultQueue;

      if (!resolvedQueue) {
        throw new Error('Unable to resolve queue for functional test scheduling');
      }

      const groupTemplate: Omit<PickTestGroupRunOrderGroup, 'names'> = {
        type: FUNCTIONAL_TYPE,
        queue: resolvedQueue,
        defaultMin: 60,
        maxMin: FUNCTIONAL_MAX_MINUTES * FUNCTIONAL_PARALLELISM,
        minimumIsolationMin: FUNCTIONAL_MINIMUM_ISOLATION_MIN,
        overheadMin: 0,
      };

      const scheduleInputs = await buildScheduleInputs(runGroup, FUNCTIONAL_MAX_MINUTES, {
        ciStats,
        sources: pickRequestSources,
        groupTemplate,
        durationCache: configDurationCache,
      });

      if (scheduleInputs.length === 0) {
        continue;
      }

      const queueAgentOptions = expandAgentQueue(resolvedQueue);
      const preferredMachineTypes = [
        queueAgentOptions.machineType,
        'n2-standard-8',
        'n2-standard-4',
      ].filter(
        (typeName): typeName is string => typeof typeName === 'string' && typeName.length > 0
      );

      const uniqueMachineTypes = Array.from(new Set(preferredMachineTypes));
      const machineTypes = uniqueMachineTypes.map((typeName) => createMachineDefinition(typeName));

      let scheduleResponse: ScheduleResponse;

      try {
        scheduleResponse = await runScheduleScript({
          configs: scheduleInputs,
          maxDurationMins: FUNCTIONAL_MAX_MINUTES,
          machines: machineTypes,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        throw new Error(
          `Failed to schedule functional configs for queue "${resolvedQueue}": ${err.message}`
        );
      }

      for (const scheduledGroup of scheduleResponse.groups) {
        if (!scheduledGroup.configs.length) {
          continue;
        }

        const key = `ftr_configs_${configCounter++}`;
        const configPaths = scheduledGroup.configs.map((config) => config.path);
        const expectedDurationMins = scheduledGroup.expectedDurationMins;

        let title: string;
        let sortBy: number | string;

        if (configPaths.length === 1) {
          [title] = configPaths;
          sortBy = title;
        } else {
          sortBy = ++groupCounter;
          title = `FTR Configs #${sortBy}`;
        }

        functionalGroups.push({
          title,
          key,
          sortBy,
          queue: resolvedQueue,
        });

        ftrRunOrder[key] = {
          title,
          expectedDurationMins,
          names: configPaths,
        };

        for (const config of scheduledGroup.configs) {
          if (config.tooLong && !ciStatsFunctionalTooLongs.has(config.path)) {
            scheduledTooLong.push({
              config: config.path,
              durationMin: config.testDurationMins,
            });
          }
        }
      }
    }

    if (scheduledTooLong.length > 0) {
      const longestDurationByConfig = new Map<string, number>();

      for (const entry of scheduledTooLong) {
        const previous = longestDurationByConfig.get(entry.config) ?? 0;
        longestDurationByConfig.set(entry.config, Math.max(previous, entry.durationMin));
      }

      const warningLines = [
        `The following "${FUNCTIONAL_TYPE}" configs have durations that exceed the maximum amount of time desired for a single CI job.`,
        'If you own these configs please split them up or reduce runtime. Ask Operations if you have questions about how to proceed.',
        '',
        ...Array.from(longestDurationByConfig.entries()).map(
          ([configPath, duration]) => ` - ${configPath}: ${duration.toFixed(1)} minutes`
        ),
      ];

      bk.setAnnotation(
        `test-group-scheduler-too-long:${FUNCTIONAL_TYPE}`,
        'warning',
        warningLines.join('\n')
      );
    }
  }

  // write the config for each step to an artifact that can be used by the individual jest jobs
  Fs.writeFileSync('jest_run_order.json', JSON.stringify({ unit, integration }, null, 2));
  bk.uploadArtifacts('jest_run_order.json');

  if (ftrConfigsIncluded) {
    // write the config for functional steps to an artifact that can be used by the individual functional jobs
    Fs.writeFileSync('ftr_run_order.json', JSON.stringify(ftrRunOrder, null, 2));
    bk.uploadArtifacts('ftr_run_order.json');
  }

  // upload the step definitions to Buildkite
  bk.uploadSteps(
    [
      unit.count > 0
        ? {
            label: 'Jest Tests',
            command: getRequiredEnv('JEST_UNIT_SCRIPT'),
            parallelism: unit.count,
            timeout_in_minutes: 120,
            key: 'jest',
            agents: {
              ...expandAgentQueue('n2-4-spot'),
              diskSizeGb: 100,
            },
            env: {
              SCOUT_TARGET_TYPE: 'local',
            },
            retry: {
              automatic: [
                { exit_status: '-1', limit: 3 },
                ...(JEST_CONFIGS_RETRY_COUNT > 0
                  ? [{ exit_status: '*', limit: JEST_CONFIGS_RETRY_COUNT }]
                  : []),
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
            agents: expandAgentQueue('n2-4-spot'),
            env: {
              SCOUT_TARGET_TYPE: 'local',
            },
            retry: {
              automatic: [
                { exit_status: '-1', limit: 3 },
                ...(JEST_CONFIGS_RETRY_COUNT > 0
                  ? [{ exit_status: '*', limit: JEST_CONFIGS_RETRY_COUNT }]
                  : []),
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
                  timeout_in_minutes: 120,
                  agents: expandAgentQueue('n2-8-spot'),
                  env: {
                    SCOUT_TARGET_TYPE: 'local',
                    FTR_CONFIG_GROUP_KEY: key,
                    ...ftrExtraArgs,
                    ...envFromlabels,
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

// copied from src/platform/packages/shared/kbn-scout/src/config/discovery/search_configs.ts
interface ScoutTestDiscoveryConfig {
  group: string;
  path: string;
  usesParallelWorkers: boolean;
  configs: string[];
  type: 'plugin' | 'package';
}

export async function pickScoutTestGroupRunOrder(scoutConfigsPath: string) {
  const bk = new BuildkiteClient();
  const envFromlabels: Record<string, string> = collectEnvFromLabels();

  if (!Fs.existsSync(scoutConfigsPath)) {
    throw new Error(`Scout configs file not found at ${scoutConfigsPath}`);
  }

  const rawScoutConfigs = JSON.parse(Fs.readFileSync(scoutConfigsPath, 'utf-8')) as Record<
    string,
    ScoutTestDiscoveryConfig
  >;
  const pluginsOrPackagesWithScoutTests: string[] = Object.keys(rawScoutConfigs);

  if (pluginsOrPackagesWithScoutTests.length === 0) {
    // no scout configs found, nothing to need to upload steps
    return;
  }

  const scoutCiRunGroups = pluginsOrPackagesWithScoutTests.map((name) => ({
    label: `Scout: [ ${rawScoutConfigs[name].group} / ${name} ] ${rawScoutConfigs[name].type}`,
    key: name,
    agents: expandAgentQueue(rawScoutConfigs[name].usesParallelWorkers ? 'n2-8-spot' : 'n2-4-spot'),
    group: rawScoutConfigs[name].group,
  }));

  // upload the step definitions to Buildkite
  bk.uploadSteps(
    [
      {
        group: 'Scout Configs',
        key: 'scout-configs',
        depends_on: ['build_scout_tests'],
        steps: scoutCiRunGroups.map(
          ({ label, key, group, agents }): BuildkiteStep => ({
            label,
            command: getRequiredEnv('SCOUT_CONFIGS_SCRIPT'),
            timeout_in_minutes: 60,
            agents,
            env: {
              SCOUT_CONFIG_GROUP_KEY: key,
              SCOUT_CONFIG_GROUP_TYPE: group,
              ...envFromlabels,
            },
            retry: {
              automatic: [
                { exit_status: '10', limit: 1 },
                { exit_status: '*', limit: 3 },
              ],
            },
          })
        ),
      },
    ].flat()
  );
}
