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
import Fs from 'fs';
import getPort from 'get-port';
import os from 'os';
import Path from 'path';
import { format } from 'util';
import chalk from 'chalk';

import { uniqueId } from 'lodash';
import {
  FLEET_PACKAGE_REGISTRY_PORT,
  TEST_AGENTLESS_PORT,
  TEST_ES_PORT,
  TEST_ES_TRANSPORT_PORT,
  TEST_FLEET_PORT,
  TEST_KIBANA_PORT,
} from '../../../service_addresses';
import { ConfigRunner } from './config_runner';
import { ResourcePool, Phase } from './resource_pool';
import type { Slot } from './resource_pool';
import { prepareChrome } from './prepare_chrome';
import { EsVersion, readConfigFile } from '../../../functional_test_runner';
import { getSlotResources, type SlotResources } from '../get_slot_resources';

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
  idleStartedAt?: number;
  idleDurationMs?: number;
  runStartedAt?: number;
  runDurationMs?: number;
  completedAt?: number;
  exitCode?: number | string;
  slotIndex?: number;
}

interface RunnerEntry {
  path: string;
  runner: ConfigRunner;
  resources: SlotResources;
  slotIndex?: number;
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
}

export async function runTestsParallel(
  log: ToolingLog,
  configs: string[],
  options: ParallelRunOptions
): Promise<number> {
  const { extraArgs, stdio = 'inherit', stats = false } = options;

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

  if (booleanFromEnv('USE_CHROME_BETA', false)) {
    await prepareChrome().catch((err) => {
      process.stdout.write(format(err) + '\n');
    });
  }

  const DEFAULT_PORTS = {
    agentless: TEST_AGENTLESS_PORT,
    fleet: TEST_FLEET_PORT,
    es: TEST_ES_PORT,
    esTransport: TEST_ES_TRANSPORT_PORT,
    kibana: TEST_KIBANA_PORT,
    packageRegistry: FLEET_PACKAGE_REGISTRY_PORT,
  };

  const portConfigEntries = await Promise.all(
    configs.map(async (config) => {
      return [
        config,
        {
          agentless: await getPort({ port: DEFAULT_PORTS.agentless }),
          fleet: await getPort({ port: DEFAULT_PORTS.fleet }),
          es: await getPort({ port: DEFAULT_PORTS.es }),
          esTransport: await getPort({ port: DEFAULT_PORTS.esTransport }),
          kibana: await getPort({ port: DEFAULT_PORTS.kibana }),
          packageRegistry: await getPort({ port: DEFAULT_PORTS.packageRegistry }),
        },
      ] as const;
    })
  );

  const portConfigs = Object.fromEntries(portConfigEntries);

  const runnerEntries: RunnerEntry[] = [];

  const failedConfigs: string[] = [];
  const results: string[] = [];
  const runnerStates = new Map<string, RunnerState>();

  for (const config of configs) {
    if (!config) continue;

    const readConfig = await readConfigFile(
      log,
      EsVersion.getDefault(),
      require.resolve(Path.join(REPO_ROOT, config)),
      {}
    );

    const ports = portConfigs[config];

    const configExecutionKey = `${config}_executed`;
    const isConfigExecution = runBuildkiteMetaGet(configExecutionKey, 'false');

    if (isConfigExecution === 'true') {
      results.push(`- ${config}\n    duration: 0s\n    result: already-tested`);
      continue;
    }

    const runner = new ConfigRunner({
      index: uniqueId(),
      log,
      ports,
      path: config,
      command: {
        exec: 'node',
        args: [
          `scripts/functional_tests`,
          `--config=${config}`,
          ...extraArgsList.flat().map((arg) => {
            return String(arg);
          }),
        ],
      },
      stdio,
    });

    const resources = getSlotResources(readConfig.getAll());
    runnerEntries.push({ path: config, runner, resources });
  }

  const MAX_CPUS = Math.max(1, os.cpus().length - 1);
  const AVAILABLE_MEM = Math.round(os.freemem() / 1024 / 1024);
  const MIN_MB_RESERVED = 2048;
  const usableMemory = Math.max(AVAILABLE_MEM - MIN_MB_RESERVED, MIN_MB_RESERVED);

  log.info(`Host capacity -> cpu=${MAX_CPUS}, memory=${usableMemory}mb`);

  const hostCapacity: SlotResources = {
    warming: { cpu: MAX_CPUS, memory: usableMemory },
    idle: { cpu: MAX_CPUS, memory: usableMemory },
    running: { cpu: MAX_CPUS, memory: usableMemory },
  };

  type PhaseName = keyof SlotResources;
  const phases: PhaseName[] = ['warming', 'idle', 'running'];

  const createEmptyUsage = (): SlotResources => ({
    warming: { cpu: 0, memory: 0 },
    idle: { cpu: 0, memory: 0 },
    running: { cpu: 0, memory: 0 },
  });

  const cloneResources = (resources: SlotResources): SlotResources => ({
    warming: { ...resources.warming },
    idle: { ...resources.idle },
    running: { ...resources.running },
  });

  const canFitWithinCapacity = (current: SlotResources, addition: SlotResources) =>
    phases.every((phase) => {
      const phaseUsage = current[phase];
      const phaseAddition = addition[phase];
      const capacity = hostCapacity[phase];
      return (
        phaseUsage.cpu + phaseAddition.cpu <= capacity.cpu &&
        phaseUsage.memory + phaseAddition.memory <= capacity.memory
      );
    });

  const accumulateUsage = (target: SlotResources, addition: SlotResources) => {
    phases.forEach((phase) => {
      target[phase].cpu += addition[phase].cpu;
      target[phase].memory += addition[phase].memory;
    });
  };

  interface SlotBin {
    runners: RunnerEntry[];
    usage: SlotResources;
  }

  const bins: SlotBin[] = [];

  const sortedEntries = [...runnerEntries].sort((a, b) => {
    const memoryDiff = b.resources.running.memory - a.resources.running.memory;
    if (memoryDiff !== 0) {
      return memoryDiff;
    }
    return b.resources.running.cpu - a.resources.running.cpu;
  });

  for (const entry of sortedEntries) {
    let placed = false;
    for (let i = 0; i < bins.length; i++) {
      const bin = bins[i];
      if (canFitWithinCapacity(bin.usage, entry.resources)) {
        bin.runners.push(entry);
        accumulateUsage(bin.usage, entry.resources);
        entry.slotIndex = i;
        placed = true;
        break;
      }
    }

    if (!placed) {
      if (!canFitWithinCapacity(createEmptyUsage(), entry.resources)) {
        log.warning(
          `Config ${entry.path} exceeds host capacity; scheduling it alone. ` +
            `running(cpu=${entry.resources.running.cpu}, memory=${entry.resources.running.memory}mb)`
        );
      }

      const newIndex = bins.length;
      bins.push({
        runners: [entry],
        usage: cloneResources(entry.resources),
      });
      entry.slotIndex = newIndex;
    }
  }

  const maxConcurrentConfigs = bins.reduce((max, bin) => Math.max(max, bin.runners.length), 0);

  const slotGroupsLabel = bins.length === 1 ? '' : 's';
  log.info(
    `Planned ${bins.length} slot group${slotGroupsLabel}; max concurrent configs ${maxConcurrentConfigs}`
  );

  bins.forEach((bin, index) => {
    const usage = bin.usage;
    log.debug(
      `Slot group ${index + 1}: configs=${bin.runners.length}, ` +
        `warming=${usage.warming.cpu.toFixed(2)}cpu/${usage.warming.memory.toFixed(1)}mb, ` +
        `running=${usage.running.cpu.toFixed(2)}cpu/${usage.running.memory.toFixed(1)}mb`
    );
  });

  const concurrencyLimit = maxConcurrentConfigs > 0 ? maxConcurrentConfigs : 0;

  let pool: ResourcePool | undefined;
  if (concurrencyLimit > 0) {
    pool = new ResourcePool({
      log,
      maxStarted: concurrencyLimit,
      maxWarming: concurrencyLimit,
      maxRunning: concurrencyLimit,
    });
  }

  let statsTimer: NodeJS.Timeout | undefined;

  let previousResourceUsage: NodeJS.ResourceUsage | undefined;

  if (stats) {
    const formatSeconds = (microseconds: number) => (microseconds / 1_000_000).toFixed(2);
    const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

    function logStats() {
      const usage = process.resourceUsage();
      const memory = process.memoryUsage();
      const loadAvg = os.loadavg();
      const freeMemMb = os.freemem() / (1024 * 1024);
      const totalMemMb = os.totalmem() / (1024 * 1024);

      const userDelta = previousResourceUsage
        ? usage.userCPUTime - previousResourceUsage.userCPUTime
        : usage.userCPUTime;
      const systemDelta = previousResourceUsage
        ? usage.systemCPUTime - previousResourceUsage.systemCPUTime
        : usage.systemCPUTime;

      previousResourceUsage = usage;

      const loadString = loadAvg.map((value) => value.toFixed(2)).join(', ');
      const messageParts = [
        `rss=${formatMb(memory.rss)}mb`,
        `heapUsed=${formatMb(memory.heapUsed)}mb`,
        `external=${formatMb(memory.external)}mb`,
        `user=${formatSeconds(userDelta)}s`,
        `system=${formatSeconds(systemDelta)}s`,
        `load=[${loadString}]`,
        `freeMem=${freeMemMb.toFixed(0)}mb`,
        `totalMem=${totalMemMb.toFixed(0)}mb`,
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

        const idleMs =
          state.idleDurationMs ??
          (state.idleStartedAt && phase !== Phase.Warming
            ? Math.max(0, now - state.idleStartedAt)
            : undefined);
        if (idleMs !== undefined && (phase === Phase.IdleBeforeRun || phase === Phase.Running)) {
          parts.push(`idle=${msToDuration(idleMs)}`);
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
        } else if (phase === Phase.IdleBeforeRun) {
          coloredLine = chalk.cyan.dim(baseLine);
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
    }

    statsTimer = setInterval(logStats, 10_000);

    statsTimer.unref();

    logStats();
  }

  const runEntry = async (entry: RunnerEntry) => {
    if (!pool) {
      throw new Error('Resource pool not initialized');
    }

    const runner = entry.runner;
    const slot = pool.acquire();
    const path = runner.getConfigPath();
    const state: RunnerState = {
      slot,
      startedAt: Date.now(),
      slotIndex: entry.slotIndex,
    };
    runnerStates.set(path, state);
    let released = false;

    try {
      log.debug(`Waiting for warming slot for ${runner.getConfigPath()}`);
      await slot.waitForWarming();
      log.info(`Warming slot acquired for ${runner.getConfigPath()}`);

      const startTime = Date.now();
      state.warmStartedAt = startTime;
      await runner.start();
      const startFinishTime = Date.now();
      state.warmDurationMs = startFinishTime - startTime;
      state.warmFinishedAt = startFinishTime;
      state.idleStartedAt = startFinishTime;

      log.debug(`Waiting for running slot for ${runner.getConfigPath()}`);
      await slot.waitForRunning();
      log.info(`Running slot acquired for ${runner.getConfigPath()}`);

      const runStartTime = Date.now();
      state.idleDurationMs = Math.max(0, runStartTime - (state.idleStartedAt ?? runStartTime));
      state.runStartedAt = runStartTime;
      const runProc = await runner.run();
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

      if (!runProc.failed) {
        runBuildkiteMetaSet(`config_${runner.getConfigPath()}`, 'true');
      } else {
        failedConfigs.push(runner.getConfigPath());
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
    } finally {
      if (!released) {
        slot.release();
        released = true;
      }
    }
  };

  if (pool) {
    for (const [index, bin] of bins.entries()) {
      const configLabel = bin.runners.length === 1 ? 'config' : 'configs';
      log.info(
        `Starting slot group ${index + 1}/${bins.length} (${bin.runners.length} ${configLabel})`
      );
      await Promise.all(bin.runners.map((entry) => runEntry(entry)));
    }
  }

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

  return failedConfigs.length ? 1 : 0;
}
