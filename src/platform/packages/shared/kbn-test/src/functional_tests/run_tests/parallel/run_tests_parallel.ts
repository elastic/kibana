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
  runStartedAt?: number;
  runDurationMs?: number;
  completedAt?: number;
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

  const runners: ConfigRunner[] = [];

  const failedConfigs: string[] = [];
  const results: string[] = [];
  const runnerStates = new Map<string, RunnerState>();

  for (const config of configs) {
    if (!config) continue;

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

    runners.push(runner);
  }

  const MAX_CPUS = os.cpus().length - 1;
  const AVAILABLE_MEM = Math.round(os.freemem() / 1024 / 1024);
  const MIN_MB_AVAILABLE = 2048;
  // const MIN_MB_PER_WARMING_SLOT = 4096;
  const MIN_MB_PER_IDLE_SLOT = 3072;
  const MIN_MB_PER_RUNNING_SLOT = 5120;
  // const WARMING_MIN_CPU = 2;
  const IDLE_MIN_CPU = 0.5;
  const RUNNING_MIN_CPU = 1;

  log.info(`Available resources: ${MAX_CPUS} cpus, ${AVAILABLE_MEM}mb`);

  const availableMemory = Math.max(AVAILABLE_MEM - MIN_MB_AVAILABLE, MIN_MB_PER_RUNNING_SLOT);

  // const maxWarmingByCpu = Math.max(1, Math.floor(MAX_CPUS / WARMING_MIN_CPU));
  // const maxWarmingByMemory = Math.max(1, Math.floor(availableMemory / MIN_MB_PER_WARMING_SLOT));
  const maxWarming = 1; // Math.max(1, Math.min(maxWarmingByCpu, maxWarmingByMemory));

  const maxStartedByCpu = Math.max(1, Math.floor(MAX_CPUS / IDLE_MIN_CPU));
  const maxStartedByMemory = Math.max(1, Math.floor(availableMemory / MIN_MB_PER_IDLE_SLOT));
  const maxStarted = Math.max(maxWarming, Math.min(maxStartedByCpu, maxStartedByMemory));

  const maxRunningByCpu = Math.max(1, Math.floor(MAX_CPUS / RUNNING_MIN_CPU));
  const maxRunningByMemory = Math.max(1, Math.floor(availableMemory / MIN_MB_PER_RUNNING_SLOT));
  const maxRunning = Math.max(1, Math.min(maxRunningByCpu, maxRunningByMemory));

  log.info(
    `Resource limits -> started: ${maxStarted}, warming: ${maxWarming}, running: ${maxRunning}`
  );

  const pool = new ResourcePool({
    log,
    maxStarted,
    maxWarming: 1,
    maxRunning,
  });

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
      const runningConfigs: string[] = [];
      const completedConfigs: string[] = [];

      for (const [path, state] of runnerStates.entries()) {
        const phase = state.slot.getPhase();
        if (phase === Phase.Running) {
          const runtimeMs = state.runStartedAt ? now - state.runStartedAt : 0;
          runningConfigs.push(`${path} (phase=${phase} runtime=${msToDuration(runtimeMs)})`);
        } else if (phase === Phase.Done) {
          const durationMs = state.runDurationMs ?? 0;
          completedConfigs.push(`${path} (phase=${phase} runtime=${msToDuration(durationMs)})`);
        }
      }

      if (runningConfigs.length > 0) {
        log.info(`Running configs:\n${runningConfigs.map((line) => `  ${line}`).join('\n')}`);
      }

      if (completedConfigs.length > 0) {
        log.info(`Completed configs:\n${completedConfigs.map((line) => `  ${line}`).join('\n')}`);
      }
    }

    statsTimer = setInterval(logStats, 10_000);

    statsTimer.unref();

    logStats();
  }

  const promises = runners.map(async (runner) => {
    const slot = pool.acquire();
    const path = runner.getConfigPath();
    const state: RunnerState = {
      slot,
      startedAt: Date.now(),
    };
    runnerStates.set(path, state);
    let released = false;

    try {
      log.info(`Waiting for warming slot for ${runner.getConfigPath()}`);
      await slot.waitForWarming();
      log.info(`Warming slot acquired for ${runner.getConfigPath()}`);

      const startTime = Date.now();
      await runner.start();
      const startFinishTime = Date.now();

      log.info(`Waiting for running slot for ${runner.getConfigPath()}`);
      await slot.waitForRunning();
      log.info(`Running slot acquired for ${runner.getConfigPath()}`);

      const runStartTime = Date.now();
      state.runStartedAt = runStartTime;
      const runProc = await runner.run();
      const runFinishTime = Date.now();

      log.info(`Completed ${runner.getConfigPath()} (exitCode ${runProc.exitCode})`);

      const startDuration = startFinishTime - startTime!;
      const runDuration = runFinishTime - runStartTime!;
      state.runDurationMs = runDuration;
      state.completedAt = runFinishTime;

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

  return failedConfigs.length ? 1 : 0;
}
