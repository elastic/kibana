/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { execSync } from 'child_process';
import dedent from 'dedent';
import execa from 'execa';
import type { ExecaReturnValue } from 'execa';
import Fs from 'fs';
import os from 'os';
import Path from 'path';
import { format } from 'util';
import chalk from 'chalk';

import { uniqueId } from 'lodash';
import { acquirePorts } from '@kbn/test-services';
import type { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { ConfigRunner } from './config_runner';
import { ResourcePool, Phase } from './resource_pool';
import type { Slot } from './resource_pool';
import { prepareChrome } from './prepare_chrome';
import { readConfig } from './read_config';
import { getSlotResources } from './get_slot_resources';
import type { SlotResources } from './get_slot_resources';
import { getAvailableMemory } from './get_available_memory';
import { startWatchingFiles } from './start_watching_files';
import type { ScheduleConfigTestGroup } from './schedule/types';

function booleanFromEnv(varName: string, defaultValue: boolean = false): boolean {
  const envValue = process.env[varName];
  if (envValue === undefined || envValue.trim().length === 0) return defaultValue;
  return ['1', 'yes', 'true'].includes(envValue.trim().toLowerCase());
}

function msToDuration(duration: number) {
  const timeSec = Math.floor(duration / 1000);
  const display = timeSec > 60 ? `${Math.floor(timeSec / 60)}m ${timeSec % 60}s` : `${timeSec}s`;
  return display;
}

interface RunnerState {
  slot: Slot;
  startedAt: number;
  warmStartedAt?: number;
  warmDurationMs?: number;
  warmFinishedAt?: number;
  runStartedAt?: number;
  runDurationMs?: number;
  completedAt?: number;
  exitCode?: number | string;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function cloneSlotResources(resources: SlotResources): SlotResources {
  return {
    warming: { ...resources.warming },
    running: { ...resources.running },
  };
}

/*
 * Run functional test configs in sequence, mirroring the behavior from
 * .buildkite/scripts/steps/test/ftr_configs.sh.
 *
 * Inputs are provided via parameters or environment variables:
 * - configs: array of config paths/names to execute
 * - KIBANA_BUILD_LOCATION env var is forwarded to the test runner
 * - USE_CHROME_BETA env var triggers chrome-beta handling
 * - SCOUT_REPORTER_ENABLED env var triggers scout upload
 * - EXTRA_ARGS can be passed via the extraArgs parameter or FTR_EXTRA_ARGS env var
 *
 * The function uses the `buildkite-agent` binary (meta-data get/set) and
 * invokes node scripts just like the shell script.
 */
export interface ParallelRunOptions {
  extraArgs: Array<string | number | boolean | string[]>;
  stdio?: 'suppress' | 'buffer' | 'inherit';
  stats?: boolean;
  category?: ScoutTestRunConfigCategory;
  group?: ScheduleConfigTestGroup;
  configs?: string[];
}

export async function runTestsParallel(
  log: ToolingLog,
  options: ParallelRunOptions
): Promise<number> {
  const {
    extraArgs,
    stdio = 'inherit',
    stats = false,
    category,
    group,
    configs: initialConfigs,
  } = options;

  const extraArgsList = [...extraArgs, process.env.FTR_EXTRA_ARGS ?? process.env.EXTRA_ARGS ?? ''];

  const runBuildkiteMetaGet = (key: string, defaultVal = ''): string => {
    try {
      const out = execSync(
        `buildkite-agent meta-data get "${key}" --default "${defaultVal}" --log-level error`,
        {
          stdio: 'ignore',
          encoding: 'utf8',
        }
      );
      return out.toString().trim();
    } catch (err) {
      return defaultVal;
    }
  };

  const runBuildkiteMetaSet = (key: string, value: string) => {
    try {
      execSync(`buildkite-agent meta-data set "${key}" "${value}"`, { stdio: 'ignore' });
    } catch (err) {
      // best-effort
    }
  };

  // const fileWatcher = startWatchingFiles({
  //   directories: [
  //     { dir: REPO_ROOT, depth: 5 },
  //     { dir: os.tmpdir(), depth: 5 },
  //   ],
  // });

  if (booleanFromEnv('USE_CHROME_BETA', false)) {
    await prepareChrome().catch((err) => {
      process.stdout.write(format(err) + '\n');
    });
  }

  const configs = initialConfigs?.length
    ? initialConfigs
    : group?.configs.map((config) => config.path) ?? [];

  const portConfigEntries = await Promise.all(
    configs.map(async (config) => {
      return [config, await acquirePorts()] as const;
    })
  );

  const portConfigs = Object.fromEntries(portConfigEntries);

  const runners: ConfigRunner[] = [];
  const runnerResources = new Map<ConfigRunner, SlotResources>();

  const failedConfigs: string[] = [];
  const results: string[] = [];
  const runnerStates = new Map<string, RunnerState>();
  const scheduleGroupMap = group ? new Map(group.configs.map((cfg) => [cfg.path, cfg])) : undefined;
  const runnerLaneAssignments = new Map<
    ConfigRunner,
    { laneIndex: number; lanePosition: number }
  >();
  const laneCounts = new Map<number, number>();

  for (const config of configs) {
    if (!config) {
      continue;
    }

    const ports = portConfigs[config];
    const configExecutionKey = `${config}_executed`;
    const isConfigExecution = runBuildkiteMetaGet(configExecutionKey, 'false');

    if (isConfigExecution === 'true') {
      results.push(`- ${config}\n    duration: 0s\n    result: already-tested`);
      continue;
    }

    const scheduledConfig = scheduleGroupMap?.get(config);
    let slotResources = scheduledConfig?.resources;
    let testCategory = scheduledConfig?.testConfigCategory;

    if (!scheduledConfig || !slotResources || (category && testCategory === undefined)) {
      const configObj = await readConfig(log, require.resolve(Path.join(REPO_ROOT, config)), {});
      const capabilities = configObj.getAll();
      if (!slotResources) {
        slotResources = getSlotResources(capabilities);
      }
      if (testCategory === undefined) {
        testCategory = configObj.get('testConfigCategory');
      }
    }

    if (!slotResources) {
      throw new Error(`Unable to determine slot resources for ${config}`);
    }

    if (category && testCategory !== category) {
      results.push(
        `- ${config}\n    duration: 0s\n    result: skipping, ${testCategory} is not ${category}`
      );
      continue;
    }

    const id = uniqueId();

    const runner = new ConfigRunner({
      index: id,
      log,
      ports,
      path: config,
      command: {
        exec: 'node',
        args: [
          `scripts/functional_tests`,
          `--config=${config}`,
          ...extraArgsList
            .flat()
            .map((arg) => {
              return String(arg);
            })
            .filter((val) => val !== ''),
        ],
      },
      stdio,
    });

    runners.push(runner);
    runnerResources.set(runner, cloneSlotResources(slotResources));

    const laneIndex = scheduledConfig?.laneIndex ?? 0;
    const nextLanePosition = laneCounts.get(laneIndex) ?? 0;
    laneCounts.set(laneIndex, nextLanePosition + 1);
    runnerLaneAssignments.set(runner, { laneIndex, lanePosition: nextLanePosition });
  }

  const laneWarmingSignals = new Map<number, Array<Deferred<void>>>();
  const laneRunningSignals = new Map<number, Array<Deferred<void>>>();

  laneCounts.forEach((count, laneIndex) => {
    const warmingSignals: Array<Deferred<void>> = [];
    const runningSignals: Array<Deferred<void>> = [];
    for (let index = 0; index < count; index += 1) {
      warmingSignals.push(createDeferred<void>());
      runningSignals.push(createDeferred<void>());
    }
    laneWarmingSignals.set(laneIndex, warmingSignals);
    laneRunningSignals.set(laneIndex, runningSignals);
  });

  const totalCpuCapacity = Math.max(1, os.cpus().length);
  const totalMemoryMb = Math.round(os.totalmem() / (1024 * 1024));
  const MEMORY_BUFFER_MB = 2048;
  const totalMemoryBudget = Math.max(0, totalMemoryMb - MEMORY_BUFFER_MB);

  log.info(
    `Detected resources: ${totalCpuCapacity} cpus, ${totalMemoryMb}mb total memory (budget ${totalMemoryBudget}mb)`
  );

  const pool = new ResourcePool({
    log,
    totalCpu: totalCpuCapacity,
    totalMemory: totalMemoryBudget,
  });

  let statsTimer: NodeJS.Timeout | undefined;

  let previousResourceUsage: NodeJS.ResourceUsage | undefined;

  function logChangedFiles() {
    // log.info(`Files changed`);
    // log.indent(4);
    // const formattedChanges = fileWatcher.getFormattedFileChanges();
    // if (formattedChanges) {
    //   log.write(formattedChanges);
    // }
    // log.indent(-4);
  }

  if (stats) {
    const formatSeconds = (microseconds: number) => (microseconds / 1_000_000).toFixed(2);
    const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

    function logStats() {
      const usage = process.resourceUsage();
      const memory = process.memoryUsage();
      const totalMemMb = os.totalmem() / (1024 * 1024);
      const poolMemory = pool.getMemoryUsage();
      const expectedAvailableMb = Math.max(0, totalMemMb - (poolMemory.used + MEMORY_BUFFER_MB));
      const availableMemMb = getAvailableMemory();
      const memoryDiffPct =
        expectedAvailableMb > 0
          ? ((availableMemMb - expectedAvailableMb) / expectedAvailableMb) * 100
          : undefined;

      const userDelta = previousResourceUsage
        ? usage.userCPUTime - previousResourceUsage.userCPUTime
        : usage.userCPUTime;
      const systemDelta = previousResourceUsage
        ? usage.systemCPUTime - previousResourceUsage.systemCPUTime
        : usage.systemCPUTime;

      previousResourceUsage = usage;

      const loadAvg = os.loadavg();
      const loadString = loadAvg.map((value: number) => value.toFixed(2)).join(', ');
      const messageParts = [
        `rss=${formatMb(memory.rss)}mb`,
        `heapUsed=${formatMb(memory.heapUsed)}mb`,
        `user=${formatSeconds(userDelta)}s`,
        `memoryBudget=${totalMemoryBudget.toFixed(0)}mb`,
        `system=${formatSeconds(systemDelta)}s`,
        `load=[${loadString}]`,
        `totalMem=${totalMemMb.toFixed(0)}mb`,
        `expectedAvail=${expectedAvailableMb.toFixed(0)}mb`,
        `availableMem=${availableMemMb.toFixed(0)}mb`,
        `memDiffPct=${
          memoryDiffPct !== undefined && Number.isFinite(memoryDiffPct)
            ? memoryDiffPct.toFixed(2)
            : 'n/a'
        }`,
      ];

      log.info(`Stats: ${messageParts.join(' ')}`);

      const now = Date.now();
      const configLines: string[] = [];

      for (const [path, state] of runnerStates.entries()) {
        const phase = state.slot.getPhase();
        const parts: string[] = [`phase=${phase}`];

        const warmMs =
          state.warmDurationMs ??
          (state.warmStartedAt ? Math.max(0, now - state.warmStartedAt) : undefined);
        if (warmMs !== undefined) {
          parts.push(`warm=${msToDuration(warmMs)}`);
        }

        const runningMs =
          state.runDurationMs ??
          (state.runStartedAt && phase === Phase.Running
            ? Math.max(0, now - state.runStartedAt)
            : undefined);
        if (runningMs !== undefined && (phase === Phase.Running || phase === Phase.Done)) {
          parts.push(`run=${msToDuration(runningMs)}`);
        }

        if (phase === Phase.Done && state.exitCode !== undefined) {
          parts.push(`exit=${state.exitCode}`);
        }

        const baseLine = `${path}: ${parts.join(' ')}`;

        let coloredLine: string;

        if (phase === Phase.Running) {
          coloredLine = chalk.cyan(baseLine);
        } else if (phase === Phase.Warming) {
          coloredLine = chalk.yellow(baseLine);
        } else if (phase === Phase.BeforeStart) {
          coloredLine = chalk.yellow.dim(baseLine);
        } else if (phase === Phase.Done) {
          const isSuccess = state.exitCode === 0;
          coloredLine = isSuccess ? chalk.greenBright(baseLine) : chalk.redBright(baseLine);
        } else {
          coloredLine = baseLine;
        }

        configLines.push(coloredLine);
      }

      if (configLines.length > 0) {
        log.info(`Configs:\n${configLines.map((line) => `  ${line}`).join('\n')}`);
      }

      // log.info(
      //   execSync(
      //     (process.platform === 'linux' ? `top -b -n 1 -o %MEM` : `top -l 1 -o mem`) +
      //       ` | head -30 `
      //   ).toString('utf-8')
      // );
    }

    statsTimer = setInterval(logStats, 10_000);

    statsTimer.unref();

    logStats();
  }

  Object.keys(require.cache).forEach((key) => {
    delete require.cache[key];
  });

  const promises = runners.map(async (runner) => {
    const slotResources = runnerResources.get(runner);
    if (!slotResources) {
      throw new Error(`Missing slot resources for ${runner.getConfigPath()}`);
    }

    const laneInfo = runnerLaneAssignments.get(runner) ?? { laneIndex: 0, lanePosition: 0 };
    const warmingSignals = laneWarmingSignals.get(laneInfo.laneIndex);
    const runningSignals = laneRunningSignals.get(laneInfo.laneIndex);

    if (!warmingSignals || !runningSignals) {
      throw new Error(`Unable to resolve lane sequencing for ${runner.getConfigPath()}`);
    }

    const slot = pool.acquire({
      label: runner.getConfigPath(),
      priority: laneInfo.lanePosition * 1000 + laneInfo.laneIndex,
      resources: slotResources,
    });
    const path = runner.getConfigPath();
    const state: RunnerState = {
      slot,
      startedAt: Date.now(),
    };

    runnerStates.set(path, state);
    let released = false;
    let resolvedWarmingSignal = false;
    let resolvedRunningSignal = false;

    const resolveWarmingSignal = () => {
      if (resolvedWarmingSignal) {
        return;
      }

      const signal = warmingSignals[laneInfo.lanePosition];
      if (signal) {
        signal.resolve();
      }

      resolvedWarmingSignal = true;
    };

    const resolveRunningSignal = () => {
      if (resolvedRunningSignal) {
        return;
      }

      const signal = runningSignals[laneInfo.lanePosition];
      if (signal) {
        signal.resolve();
      }

      resolvedRunningSignal = true;
    };

    try {
      if (laneInfo.lanePosition > 0) {
        await warmingSignals[laneInfo.lanePosition - 1].promise;
      }

      log.debug(`Waiting for warming slot for ${runner.getConfigPath()}`);
      await slot.waitForWarming();
      log.info(`Warming slot acquired for ${runner.getConfigPath()}`);

      const startTime = Date.now();
      state.warmStartedAt = startTime;
      let warmPromise: Promise<void>;
      try {
        warmPromise = runner.start();
      } catch (error) {
        resolveWarmingSignal();
        throw error;
      }

      resolveWarmingSignal();
      await warmPromise;
      const startFinishTime = Date.now();
      state.warmDurationMs = startFinishTime - startTime;
      state.warmFinishedAt = startFinishTime;

      if (laneInfo.lanePosition > 0) {
        await runningSignals[laneInfo.lanePosition - 1].promise;
      }

      log.info(`Waiting for running slot for ${runner.getConfigPath()}`);
      await slot.waitForRunning();
      log.info(`Running slot acquired for ${runner.getConfigPath()}`);

      let runPromise: Promise<ExecaReturnValue<string>>;
      try {
        runPromise = runner.run();
      } catch (error) {
        resolveRunningSignal();
        throw error;
      }
      const runStartTime = Date.now();
      state.runStartedAt = runStartTime;
      resolveRunningSignal();
      const runProc = await runPromise;
      const runFinishTime = Date.now();

      log.info(`Completed ${runner.getConfigPath()} (exitCode ${runProc.exitCode})`);

      const startDuration = startFinishTime - startTime!;
      const runDuration = runFinishTime - runStartTime!;
      state.runDurationMs = runDuration;
      state.completedAt = runFinishTime;
      state.exitCode = runProc.exitCode ?? runProc.signal ?? -1;

      const result = dedent(
        `- ${path}
            result: ${runProc.exitCode ?? runProc.signal ?? -1}
            start: ${msToDuration(startDuration)}
            run: ${msToDuration(runDuration)}
      `
      );

      results.push(result);

      if (runProc.all && (stdio === 'buffer' || (stdio === 'suppress' && runProc.failed))) {
        process.stdout.write(runProc.all + '\n');
      }

      if (booleanFromEnv('SCOUT_REPORTER_ENABLED', false)) {
        const scoutProc = await execa('node', [
          'scripts/scout',
          'upload-events',
          '--dontFailOnError',
        ]);
        process.stderr.write(scoutProc.stderr ?? '');
        process.stdout.write(scoutProc.stdout ?? '');
        Fs.rmSync(Path.join(REPO_ROOT, '.scout/reports'), { recursive: true, force: true });
      }

      if (!runProc.failed) {
        runBuildkiteMetaSet(`config_${runner.getConfigPath()}`, 'true');
      } else {
        failedConfigs.push(runner.getConfigPath());
      }
    } finally {
      resolveWarmingSignal();
      resolveRunningSignal();
      if (!released) {
        slot.release();
        released = true;
      }
    }
  });

  await Promise.all(promises);

  if (statsTimer) {
    clearInterval(statsTimer);
  }

  process.stdout.write(
    `Results:
      ${results.join('\n')}
    `
  );

  if (failedConfigs.length) {
    const FAILED_CONFIGS_KEY = `${process.env.BUILDKITE_STEP_ID || ''}${
      process.env.FTR_CONFIG_GROUP_KEY || ''
    }`;
    if (FAILED_CONFIGS_KEY) {
      runBuildkiteMetaSet(FAILED_CONFIGS_KEY, failedConfigs.join('\n'));
    }
  }

  logChangedFiles();

  fileWatcher.unsubscribe();

  return failedConfigs.length ? 1 : 0;
}
