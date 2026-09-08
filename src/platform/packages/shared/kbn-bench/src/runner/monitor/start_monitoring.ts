/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import fs from 'fs';
import path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { z } from '@kbn/zod/v4';
import type { ForcedGcHeapStats, ProcStats, ProcStatSample } from './types';
import { aggregateProcStatSamples } from '../../report/aggregate_proc_stats';

const FORCED_GC_TIMEOUT_MS = 30_000;
const FORCED_GC_REQUEST_FILE = 'forced_gc_request.json';
const POLL_INTERVAL_MS = 25;

export interface MonitoringResult {
  readonly stats: ProcStats[];
  readonly samples: readonly ProcStatSample[][];
  readonly forcedGcHeapStats?: readonly ForcedGcHeapStats[];
}

export interface StopMonitoringOptions {
  readonly collectForcedGcHeapStats?: boolean;
}

interface ForcedGcRequest {
  readonly requestId: string;
  readonly requestedAt: string;
  readonly expectedPids: readonly number[];
}

const wait = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};

const toForcedGcErrorResult = ({
  request,
  pid,
  name,
  message,
}: {
  request: ForcedGcRequest;
  pid: number;
  name: string;
  message: string;
}): ForcedGcHeapStats => ({
  requestId: request.requestId,
  pid,
  argv: [],
  requestedAt: request.requestedAt,
  startedAt: request.requestedAt,
  completedAt: new Date().toISOString(),
  nodeVersion: '',
  v8Version: '',
  error: { name, message },
});

const toMonitorControlError = (name: string, message: string): ForcedGcHeapStats => {
  const timestamp = new Date().toISOString();
  return {
    requestId: `monitor-${process.pid}-${Date.now()}`,
    pid: 0,
    argv: [],
    requestedAt: timestamp,
    startedAt: timestamp,
    completedAt: timestamp,
    nodeVersion: process.versions.node,
    v8Version: process.versions.v8,
    error: { name, message },
  };
};

// Only the decision-critical field and the request identity are required.
// Diagnostics (heap spaces, durations, versions) vary across Node versions —
// e.g. Node 22 lacks Runtime.getHeapUsage — and a missing diagnostic must not
// discard an otherwise valid sample. Unknown extra fields are ignored.
const forcedGcResultSchema = z
  .object({
    requestedAt: z.string().min(1),
    postForcedGcHeapUsed: z.number().finite(),
  })
  .loose();

const validateForcedGcResult = (result: ForcedGcHeapStats, request: ForcedGcRequest): string[] => {
  if (result.error) return [];

  const validation = forcedGcResultSchema.safeParse(result);
  const invalid = validation.success
    ? []
    : validation.error.issues.map(({ path: issuePath }) => issuePath.join('.'));
  if (result.requestedAt !== request.requestedAt) invalid.push('requestedAt');
  return invalid;
};

const readForcedGcResult = async ({
  monitorDir,
  request,
  pid,
}: {
  monitorDir: string;
  request: ForcedGcRequest;
  pid: number;
}): Promise<ForcedGcHeapStats | undefined> => {
  const resultPath = path.join(monitorDir, `${pid}.forced_gc.json`);
  try {
    const result = JSON.parse(await fs.promises.readFile(resultPath, 'utf8')) as ForcedGcHeapStats;
    if (result.pid !== pid || result.requestId !== request.requestId) {
      return toForcedGcErrorResult({
        request,
        pid,
        name: 'ForcedGcHeapStatsIdentityError',
        message: `Forced-GC result identity did not match request ${request.requestId} and PID ${pid}`,
      });
    }
    const invalid = validateForcedGcResult(result, request);
    return invalid.length
      ? {
          ...result,
          error: {
            name: 'ForcedGcHeapStatsValidationError',
            message: `Forced-GC result for PID ${pid} is missing required fields: ${invalid.join(
              ', '
            )}`,
          },
        }
      : result;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    return toForcedGcErrorResult({
      request,
      pid,
      name: 'ForcedGcHeapStatsParseError',
      message: `Failed to parse forced-GC result for PID ${pid}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
};

export const requestForcedGcHeapStats = async ({
  monitorDir,
  expectedPids,
  timeoutMs = FORCED_GC_TIMEOUT_MS,
}: {
  monitorDir: string;
  expectedPids: readonly number[];
  timeoutMs?: number;
}): Promise<ForcedGcHeapStats[]> => {
  if (!expectedPids.length) {
    return [
      toMonitorControlError(
        'ForcedGcHeapStatsNoProcessesError',
        'No monitored PIDs were available for forced-GC heap collection'
      ),
    ];
  }

  const request: ForcedGcRequest = {
    requestId: `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    requestedAt: new Date().toISOString(),
    expectedPids,
  };
  const requestPath = path.join(monitorDir, FORCED_GC_REQUEST_FILE);
  const temporaryRequestPath = `${requestPath}.tmp`;
  await fs.promises.writeFile(temporaryRequestPath, `${JSON.stringify(request)}\n`, 'utf8');
  await fs.promises.rename(temporaryRequestPath, requestPath);

  const results = new Map<number, ForcedGcHeapStats>();
  const deadline = Date.now() + timeoutMs;
  while (results.size < expectedPids.length && Date.now() < deadline) {
    for (const pid of expectedPids) {
      if (!results.has(pid)) {
        const result = await readForcedGcResult({ monitorDir, request, pid });
        if (result) {
          results.set(pid, result);
        }
      }
    }
    if (results.size < expectedPids.length) {
      await wait(POLL_INTERVAL_MS);
    }
  }

  const completedAt = new Date().toISOString();
  return expectedPids.map(
    (pid) =>
      results.get(pid) ?? {
        requestId: request.requestId,
        pid,
        argv: [],
        requestedAt: request.requestedAt,
        startedAt: request.requestedAt,
        completedAt,
        nodeVersion: '',
        v8Version: '',
        error: {
          name: 'ForcedGcHeapStatsTimeoutError',
          message: `Timed out after ${timeoutMs}ms waiting for forced-GC heap stats from PID ${pid}`,
        },
      }
  );
};

const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

const readNaturalStats = async ({
  monitorDir,
  log,
}: {
  monitorDir: string;
  log: ToolingLog;
}): Promise<Pick<MonitoringResult, 'stats' | 'samples'>> => {
  const files: string[] = await fs.promises
    .readdir(monitorDir)
    .then((readFiles) => readFiles.filter((file) => file.endsWith('.ndjson')))
    .catch((error) => {
      log.warning(
        new Error(`Failed to read monitor directory at ${monitorDir}`, {
          cause: error,
        })
      );
      return [];
    });

  const stats: ProcStats[] = [];
  const samplesByProcess: ProcStatSample[][] = [];
  for (const file of files) {
    const lines = await fs.promises.readFile(path.join(monitorDir, file), 'utf8').then((content) =>
      content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    );
    const samples = lines.map((line) => JSON.parse(line) as ProcStatSample);

    if (samples.length) {
      const stat = aggregateProcStatSamples(samples);
      if (stat.pid !== process.pid) {
        stats.push(stat);
        samplesByProcess.push(samples);
      }
    }
  }

  return { stats, samples: samplesByProcess };
};

export async function startMonitoring({
  dir,
  procStatsRefreshInterval = 250,
  log,
}: {
  dir: string;
  procStatsRefreshInterval?: number;
  log: ToolingLog;
}): Promise<(options?: StopMonitoringOptions) => Promise<MonitoringResult>> {
  const monitorDir = path.resolve(dir, 'monitor', Math.random().toString().substring(-6));
  await fs.promises.mkdir(monitorDir, { recursive: true });

  const agentPath = require.resolve('./init_monitoring.js');
  const prevNodeOptions = process.env.NODE_OPTIONS ?? '';
  const requireFlag = `--require=${agentPath}`;

  process.env.NODE_OPTIONS = [prevNodeOptions, requireFlag].filter(Boolean).join(' ').trim();
  process.env.KBN_BENCH_MONITOR_DIR = monitorDir;
  process.env.KBN_BENCH_MONITOR_INTERVAL = String(procStatsRefreshInterval);
  log.debug(`kbn-bench monitor enabled: dir=${monitorDir}`);

  const restoreEnvironment = () => {
    if (prevNodeOptions) {
      const current = process.env.NODE_OPTIONS ?? '';
      process.env.NODE_OPTIONS = current
        .split(' ')
        .filter((part) => part && part !== requireFlag)
        .join(' ');
    } else {
      delete process.env.NODE_OPTIONS;
    }
    delete process.env.KBN_BENCH_MONITOR_DIR;
    delete process.env.KBN_BENCH_MONITOR_INTERVAL;
  };

  let stopPromise: Promise<MonitoringResult> | undefined;
  return async function stopMonitoring(options = {}) {
    stopPromise ??= (async () => {
      const naturalFiles = await fs.promises
        .readdir(monitorDir)
        .then((files) => files.filter((file) => /^\d+\.ndjson$/.test(file)))
        .catch(() => []);
      const expectedPids = naturalFiles
        .map((file) => Number.parseInt(file, 10))
        .filter((pid) => pid !== process.pid)
        .filter(isProcessAlive);
      let forcedGcHeapStats: ForcedGcHeapStats[] | undefined;

      if (options.collectForcedGcHeapStats) {
        try {
          forcedGcHeapStats = await requestForcedGcHeapStats({ monitorDir, expectedPids });
        } catch (error) {
          forcedGcHeapStats = [
            toMonitorControlError(
              'ForcedGcHeapStatsControlError',
              `Failed to request forced-GC heap stats: ${
                error instanceof Error ? error.message : String(error)
              }`
            ),
          ];
        }
      }

      try {
        await fs.promises.writeFile(path.join(monitorDir, 'stop'), '1', 'utf8');
      } catch (error) {
        if (!options.collectForcedGcHeapStats) {
          throw error;
        }
        forcedGcHeapStats = [
          ...(forcedGcHeapStats ?? []),
          toMonitorControlError(
            'ForcedGcHeapStatsControlError',
            `Failed to stop process monitoring: ${
              error instanceof Error ? error.message : String(error)
            }`
          ),
        ];
      } finally {
        restoreEnvironment();
      }

      if (!options.collectForcedGcHeapStats) {
        await wait(50);
      }

      const natural = await readNaturalStats({ monitorDir, log });
      const hasForcedGcError = forcedGcHeapStats?.some(({ error }) => error);
      if (hasForcedGcError) {
        log.warning(`Preserving failed forced-GC monitor diagnostics at ${monitorDir}`);
      } else {
        await fs.promises.rm(monitorDir, { recursive: true, force: true });
      }

      return { ...natural, forcedGcHeapStats };
    })();
    return stopPromise;
  };
}
