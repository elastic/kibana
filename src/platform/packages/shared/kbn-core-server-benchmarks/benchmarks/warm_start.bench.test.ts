/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { ToolingLog } from '@kbn/tooling-log';
import getPort from 'get-port';
import type { BenchmarkRunContext } from '@kbn/bench';
import warmStart, { WARM_START_POST_READY_SETTLING_MS } from './warm_start.bench';
import { startKibana } from './utils';

vi.mock('get-port');
vi.mock('./utils', () => {
  const mocked = {
    startEs: vi.fn(),
    startKibana: vi.fn(),
    stopGracefully: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockedGetPort = getPort as MockedFunction<typeof getPort>;
const mockedStartKibana = startKibana as MockedFunction<typeof startKibana>;

const context: BenchmarkRunContext = {
  log: {} as ToolingLog,
  workspace: { getDir: () => 'workspace' } as BenchmarkRunContext['workspace'],
};

describe('warm_start', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedGetPort.mockResolvedValue(5701);
    mockedStartKibana.mockResolvedValue({
      proc: {} as Awaited<ReturnType<typeof startKibana>>['proc'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('keeps a measured Kibana start alive for the fixed post-ready settling window', async () => {
    const runnable = await warmStart();
    expect(runnable.monitoring).toEqual({ collectForcedGcHeapStatsOnStop: true });
    const run = runnable.run(context);

    await Promise.resolve();
    expect(mockedStartKibana).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(WARM_START_POST_READY_SETTLING_MS - 1);
    expect(mockedStartKibana).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await run;
  });
});
