/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Axios from 'axios';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import Path from 'path';

import { CiStatsReporter } from './ci_stats_reporter';

jest.mock('axios');
jest.mock(
  'execa',
  () => (command: string, args: string[], options: { timeout: number }) =>
    mockExeca(command, args, options)
);

const mockExeca = jest.fn<Promise<{ stdout: string }>, [string, string[], { timeout: number }]>();

describe('CiStatsReporter authentication', () => {
  const request = jest.mocked(Axios.request);
  const mint = mockExeca;
  const log = new ToolingLog();
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CODEX_SANDBOX;
    delete process.env.CI_STATS_DISABLED;
    request.mockReset();
    request.mockResolvedValue({ data: {} });
    mint.mockReset();
    mint.mockResolvedValue({ stdout: 'mock-oidc-token\n' });
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  const brokerReporter = () =>
    new CiStatsReporter(
      {
        buildId: 'build-id',
        apiUrl: 'https://broker.example/proxy/kibana.ci_stats',
        authType: 'buildkite_oidc',
      },
      log
    );

  it('accepts broker config without a secret and mints only when reporting', async () => {
    const reporter = brokerReporter();
    expect(reporter.hasBuildConfig()).toBe(true);
    expect(mint).not.toHaveBeenCalled();
    await reporter.metrics([]);
    await reporter.metrics([]);
    expect(mint).toHaveBeenCalledTimes(1);
    expect(mint).toHaveBeenCalledWith(
      'bash',
      [Path.resolve(REPO_ROOT, '.buildkite/scripts/common/ci_stats_oidc_token.sh')],
      { timeout: 30_000 }
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://broker.example/proxy/kibana.ci_stats',
        headers: { Authorization: 'Bearer mock-oidc-token' },
        allowAbsoluteUrls: false,
      })
    );
  });

  it('refreshes the token before expiry', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(0);
    const reporter = brokerReporter();
    await reporter.metrics([]);
    now.mockReturnValue(239_999);
    await reporter.metrics([]);
    expect(mint).toHaveBeenCalledTimes(1);
    now.mockReturnValue(240_000);
    await reporter.metrics([]);
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it('shares a pending mint between concurrent requests', async () => {
    const reporter = brokerReporter();
    await Promise.all([reporter.metrics([]), reporter.metrics([])]);
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it('reports test groups and NDJSON test runs without an upstream token', async () => {
    request.mockResolvedValueOnce({ data: { groupId: 'group-id' } });
    await brokerReporter().reportTests({
      group: {
        name: 'group',
        type: 'jest',
        startTime: '2026-10-05T00:00:00Z',
        durationMs: 10,
        result: 'pass',
        meta: {},
      },
      testRuns: [
        {
          name: 'test',
          type: 'test',
          file: 'test.ts',
          suites: [],
          startTime: '2026-10-05T00:00:00Z',
          durationMs: 10,
          seq: 1,
          result: 'pass',
        },
      ],
    });
    expect(mint).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: '/v2/test_runs',
        params: { buildId: 'build-id', groupId: 'group-id', groupType: 'jest' },
        data: expect.any(String),
        headers: { Authorization: 'Bearer mock-oidc-token' },
      })
    );
  });

  it('retries a transient mint failure without failing the report', async () => {
    jest.useFakeTimers();
    const warning = jest.spyOn(log, 'warning').mockImplementation(() => {});
    mint.mockRejectedValueOnce(new Error('OIDC unavailable'));
    const reporting = brokerReporter().metrics([]);

    await jest.advanceTimersByTimeAsync(10_000);
    await expect(reporting).resolves.toBe(true);
    expect(mint).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('OIDC unavailable'));
  });

  it('warns and returns when token minting keeps failing', async () => {
    jest.useFakeTimers();
    const warning = jest.spyOn(log, 'warning').mockImplementation(() => {});
    mint.mockRejectedValue(new Error('buildkite-agent unavailable'));
    const reporting = brokerReporter().metrics([]);

    await jest.runAllTimersAsync();
    await expect(reporting).resolves.toBe(false);
    expect(mint).toHaveBeenCalledTimes(5);
    expect(request).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('failed to mint CI Stats OIDC token too many times')
    );
  });

  it('mints a new token and retries once when the broker rejects the token', async () => {
    const warning = jest.spyOn(log, 'warning').mockImplementation(() => {});
    const unauthorized = Object.assign(new Error('Unauthorized'), {
      request: {},
      response: { status: 401, data: 'rejected' },
    });
    mint
      .mockResolvedValueOnce({ stdout: 'stale-token' })
      .mockResolvedValueOnce({ stdout: 'fresh-token' });
    request.mockRejectedValueOnce(unauthorized);

    await expect(brokerReporter().metrics([])).resolves.toBe(true);
    expect(mint).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Bearer fresh-token' } })
    );
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('OIDC token was rejected'));
  });

  it('does not retry a rejected token more than once', async () => {
    const warning = jest.spyOn(log, 'warning').mockImplementation(() => {});
    request.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        request: {},
        response: { status: 401, data: 'rejected' },
      })
    );

    await expect(brokerReporter().metrics([])).resolves.toBe(false);
    expect(mint).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('[status=401]'));
  });

  it('preserves direct authentication and the default endpoint', async () => {
    const reporter = new CiStatsReporter({ buildId: 'build-id', apiToken: 'upstream-token' }, log);
    await reporter.metrics([]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://ci-stats.kibana.dev',
        headers: { Authorization: 'token upstream-token' },
      })
    );
    expect(mint).not.toHaveBeenCalled();
  });

  it('does not mint or report when disabled', async () => {
    process.env.CI_STATS_DISABLED = 'true';
    await brokerReporter().metrics([]);
    expect(mint).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
});
