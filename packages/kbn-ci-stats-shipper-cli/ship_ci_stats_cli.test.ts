/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

jest.mock('@kbn/ci-stats-reporter', () => ({
  CiStatsReporter: {
    fromEnv: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

import Fs from 'fs';

import type { CiStatsMetric } from '@kbn/ci-stats-reporter';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';

const mockRun = jest.requireMock('@kbn/dev-cli-runner').run as jest.Mock;
const mockReadFileSync = Fs.readFileSync as jest.MockedFunction<typeof Fs.readFileSync>;

describe('ship_ci_stats_cli', () => {
  let runCallback: (args: {
    log: { success: jest.Mock; debug: jest.Mock };
    flagsReader: { boolean: jest.Mock; arrayOfStrings: jest.Mock };
  }) => Promise<void>;

  const mockMetrics = jest.fn();
  const mockFromEnv = CiStatsReporter.fromEnv as jest.MockedFunction<
    typeof CiStatsReporter.fromEnv
  >;

  beforeAll(() => {
    require('./ship_ci_stats_cli');
    runCallback = mockRun.mock.calls[0][0];
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.IGNORE_SHIP_CI_STATS_ERROR;

    mockFromEnv.mockReturnValue({
      isEnabled: () => true,
      metrics: mockMetrics,
    } as any);

    mockMetrics.mockResolvedValue(true);
  });

  const makeFlagsReader = (opts: { validate?: boolean; metrics?: string[] }) => ({
    boolean: jest.fn((name: string) => {
      if (name === 'validate') {
        return opts.validate ?? false;
      }
      throw new Error(`unexpected boolean flag ${name}`);
    }),
    arrayOfStrings: jest.fn((name: string) => {
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
      log: { success: jest.fn(), debug: jest.fn() },
      flagsReader: makeFlagsReader({ validate: opts.validate, metrics: paths }),
    });
  };

  it('when limitConfigPath includes kbn-rspack-optimizer, update command uses build_rspack_bundles --update-limits', async () => {
    const metrics: CiStatsMetric[] = [
      {
        group: 'g',
        id: 'somePlugin',
        value: 200,
        limit: 100,
        limitConfigPath: 'packages/kbn-rspack-optimizer/limits.yml',
      },
    ];

    await expect(runWithMetrics(metrics, { validate: true })).rejects.toThrow(
      /build_rspack_bundles --update-limits/
    );
  });

  it('when limitConfigPath does not include kbn-rspack-optimizer, update command uses build_kibana_platform_plugins --focus with plugin id', async () => {
    const metrics: CiStatsMetric[] = [
      {
        group: 'g',
        id: 'myPlugin',
        value: 200,
        limit: 100,
        limitConfigPath: 'src/dev/build/limits.json',
      },
    ];

    await expect(runWithMetrics(metrics, { validate: true })).rejects.toThrow(
      /build_kibana_platform_plugins --focus myPlugin --update-limits/
    );
  });

  it('over-limit metric includes the correct update command in the error message', async () => {
    const metrics: CiStatsMetric[] = [
      {
        group: 'bundle size',
        id: 'discover',
        value: 999,
        limit: 1,
        limitConfigPath: 'packages/kbn-rspack-optimizer/foo',
      },
    ];

    await expect(runWithMetrics(metrics, { validate: true })).rejects.toThrow('Metric overages:');
    await expect(runWithMetrics(metrics, { validate: true })).rejects.toThrow(
      'bundle size for discover plugin is greater than the limit of 1'
    );
    await expect(runWithMetrics(metrics, { validate: true })).rejects.toThrow(
      'node scripts/build_rspack_bundles --update-limits'
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

  it('lists rspack update command once when multiple rspack metrics are over limit', async () => {
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
    expect(message.match(/node scripts\/build_rspack_bundles --update-limits/g)?.length ?? 0).toBe(
      1
    );
    expect(
      message.match(/To update the limit, run the following command locally:/g)?.length ?? 0
    ).toBe(1);
  });
});
