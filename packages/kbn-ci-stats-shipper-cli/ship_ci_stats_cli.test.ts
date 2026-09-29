/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

vi.mock('@kbn/dev-cli-runner', () => {
      const mocked = {
      run: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/ci-stats-reporter', () => {
      const mocked = {
      CiStatsReporter: {
        fromEnv: vi.fn(),
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('fs', () => {
      const mocked = {
      readFileSync: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

import Fs from 'fs';

import type { CiStatsMetric } from '@kbn/ci-stats-reporter';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';

const mockRun = (await vi.importMock('@kbn/dev-cli-runner')).run as Mock;
const mockReadFileSync = Fs.readFileSync as MockedFunction<typeof Fs.readFileSync>;

describe('ship_ci_stats_cli', () => {
  let runCallback: (args: {
    log: { success: Mock; debug: Mock };
    flagsReader: { boolean: Mock; arrayOfStrings: Mock };
  }) => Promise<void>;

  const mockMetrics = vi.fn();
  const mockFromEnv = CiStatsReporter.fromEnv as MockedFunction<
    typeof CiStatsReporter.fromEnv
  >;

  beforeAll(() => {
    require('./ship_ci_stats_cli');
    runCallback = mockRun.mock.calls[0][0];
  });

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.IGNORE_SHIP_CI_STATS_ERROR;

    mockFromEnv.mockReturnValue({
      isEnabled: () => true,
      metrics: mockMetrics,
    } as any);

    mockMetrics.mockResolvedValue(true);
  });

  const makeFlagsReader = (opts: { validate?: boolean; metrics?: string[] }) => ({
    boolean: vi.fn((name: string) => {
      if (name === 'validate') {
        return opts.validate ?? false;
      }
      throw new Error(`unexpected boolean flag ${name}`);
    }),
    arrayOfStrings: vi.fn((name: string) => {
      if (name === 'metrics') {
        return opts.metrics;
      }
      return undefined;
    }),
  });

  const runWithMetrics = async (
    metrics: CiStatsMetric[],
    opts: { validate?: boolean; metricsPaths?: string[] } = {}
  ) => {
    const paths = opts.metricsPaths ?? ['/tmp/ci-stats-metrics.json'];
    mockReadFileSync.mockReturnValue(JSON.stringify(metrics));
    await runCallback({
      log: { success: vi.fn(), debug: vi.fn() },
      flagsReader: makeFlagsReader({ validate: opts.validate, metrics: paths }),
    });
  };

  it('over-limit metric includes the correct update command in the error message', async () => {
    const metrics: CiStatsMetric[] = [
      {
        group: 'bundle size',
        id: 'discover',
        value: 999,
        limit: 1,
        limitConfigPath: 'packages/kbn-rspack-optimizer/limits.yml',
      },
    ];

    await expect(runWithMetrics(metrics, { validate: true })).rejects.toThrow('Metric overages:');
    await expect(runWithMetrics(metrics, { validate: true })).rejects.toThrow(
      'bundle size for discover plugin is greater than the limit of 1'
    );
    await expect(runWithMetrics(metrics, { validate: true })).rejects.toThrow(
      'node scripts/build_kibana_platform_plugins --update-limits'
    );
  });

  it('within-limit metrics produce no validation error', async () => {
    const metrics: CiStatsMetric[] = [
      {
        group: 'g',
        id: 'p',
        value: 50,
        limit: 100,
        limitConfigPath: 'packages/kbn-rspack-optimizer/limits.yml',
      },
    ];

    await expect(runWithMetrics(metrics, { validate: true })).resolves.toBeUndefined();
  });

  it('lists the update command once when multiple metrics are over limit', async () => {
    const metrics: CiStatsMetric[] = [
      {
        group: 'page load bundle size',
        id: 'pluginA',
        value: 200,
        limit: 100,
        limitConfigPath: 'packages/kbn-rspack-optimizer/limits.yml',
      },
      {
        group: 'page load bundle size',
        id: 'pluginB',
        value: 200,
        limit: 100,
        limitConfigPath: 'packages/kbn-rspack-optimizer/limits.yml',
      },
    ];

    let caught: unknown;
    try {
      await runWithMetrics(metrics, { validate: true });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeDefined();
    const message = (caught as Error).message;
    expect(message).toContain('Metric overages:');
    expect(
      message.match(/node scripts\/build_kibana_platform_plugins --update-limits/g)?.length ?? 0
    ).toBe(1);
    expect(
      message.match(/To update the limit, run the following command locally:/g)?.length ?? 0
    ).toBe(1);
  });
});
