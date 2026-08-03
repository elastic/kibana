/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { IWorkspace } from '@kbn/workspaces';
import type { LoadedBenchConfig, ModuleBenchmark } from '../config/types';
import type { GlobalRunContext } from '../types';
import { startMonitoring } from './monitor/start_monitoring';
import { createBenchmarkExecutor } from './run_benchmark';
import type { BenchmarkRunnable } from './types';

jest.mock('./monitor/start_monitoring');

const mockedStartMonitoring = jest.mocked(startMonitoring);
const stopMonitoring = jest.fn();
const benchmark: ModuleBenchmark = {
  kind: 'module',
  name: 'test',
  module: 'test.ts',
};
const context = {
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  } as unknown as ToolingLog,
  dataDir: 'data',
  workspace: {
    getDisplayName: () => 'workspace',
  } as IWorkspace,
} as GlobalRunContext;
const config = {
  name: 'test',
  path: 'test.ts',
  runs: 1,
  monitorInterval: 250,
  timeout: 1_000,
  profile: false,
} as LoadedBenchConfig;

const run = async (runnable: BenchmarkRunnable) => {
  const executor = createBenchmarkExecutor({ context, config, benchmark, runnable });
  return executor.run();
};

describe('benchmark monitoring lifecycle', () => {
  beforeEach(() => {
    stopMonitoring.mockResolvedValue({ stats: [], samples: [] });
    mockedStartMonitoring.mockResolvedValue(stopMonitoring);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('collects forced-GC stats only after a successful opted-in run', async () => {
    await run({
      monitoring: { collectForcedGcHeapStatsOnStop: true },
      run: async () => {},
    });

    expect(stopMonitoring).toHaveBeenCalledWith({ collectForcedGcHeapStats: true });
  });

  it('stops without forced GC when the runnable fails', async () => {
    const result = await run({
      monitoring: { collectForcedGcHeapStatsOnStop: true },
      run: async () => {
        throw new Error('run failed');
      },
    });

    expect(result.status).toBe('failed');
    expect(stopMonitoring).toHaveBeenCalledWith();
  });

  it('fails the run while retaining probe diagnostics when collection reports an error', async () => {
    stopMonitoring.mockResolvedValue({
      stats: [],
      samples: [],
      forcedGcHeapStats: [
        {
          requestId: 'request',
          pid: 123,
          argv: ['node'],
          requestedAt: 'now',
          startedAt: 'now',
          completedAt: 'now',
          nodeVersion: '24.18.0',
          v8Version: '13.6',
          error: { name: 'Error', message: 'protocol failed' },
        },
      ],
    });

    const result = await run({
      monitoring: { collectForcedGcHeapStatsOnStop: true },
      run: async () => {},
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        forcedGcHeapStats: [expect.objectContaining({ pid: 123 })],
      })
    );
  });
});
