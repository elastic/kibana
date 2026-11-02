/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';

import { CiStatsClient } from './client.ts';

jest.mock('axios');

describe('CiStatsClient authentication', () => {
  const request = jest.mocked(axios.request);
  const originalEnv = process.env;
  let root: string;

  beforeEach(() => {
    root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'ci-stats-client-'));
    Fs.writeFileSync(Path.join(root, 'calls'), '');
    Fs.writeFileSync(
      Path.join(root, 'buildkite-agent'),
      `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALLS_FILE"
printf '%s\\n' mock-oidc-token
`,
      { mode: 0o755 }
    );
    process.env = {
      ...originalEnv,
      PATH: `${root}:${originalEnv.PATH}`,
      CALLS_FILE: Path.join(root, 'calls'),
      CI_STATS_AUTH_TYPE: 'token',
    };
    request.mockReset();
    request.mockResolvedValue({ data: { id: 'build-id' } });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
    Fs.rmSync(root, { recursive: true, force: true });
  });

  const brokerClient = () =>
    new CiStatsClient({
      baseUrl: 'https://broker.example/proxy/kibana.ci_stats',
      authType: 'buildkite_oidc',
    });

  it('mints lazily and sends OIDC bearer authentication through the proxy path', async () => {
    const client = brokerClient();
    expect(Fs.readFileSync(Path.join(root, 'calls'), 'utf8')).toBe('');
    await client.createBuild();
    await client.getPrReport('build-id');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://broker.example/proxy/kibana.ci_stats',
        headers: { Authorization: 'Bearer mock-oidc-token' },
        allowAbsoluteUrls: false,
      })
    );
    expect(Fs.readFileSync(Path.join(root, 'calls'), 'utf8').trim().split('\n')).toHaveLength(1);
  });

  it('refreshes the token before its five-minute lifetime expires', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(0);
    const client = brokerClient();
    await client.createBuild();
    now.mockReturnValue(240_000);
    await client.createBuild();
    expect(Fs.readFileSync(Path.join(root, 'calls'), 'utf8').trim().split('\n')).toHaveLength(2);
  });

  it('uses broker authentication for test group scheduling too', async () => {
    await brokerClient().pickTestGroupRunOrder({ sources: [], groups: [] });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/v2/_pick_test_group_run_order',
        headers: { Authorization: 'Bearer mock-oidc-token' },
      })
    );
  });

  it('retries test group scheduling and mints a new token after a rejected token', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const realSetTimeout = global.setTimeout;
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(((callback: () => void, ms?: number) =>
        realSetTimeout(callback, ms === 3000 ? 0 : ms)) as typeof setTimeout);
    request.mockRejectedValueOnce({ response: { status: 401, data: {} } });

    await expect(
      brokerClient().pickTestGroupRunOrder({ sources: [], groups: [] })
    ).resolves.toEqual({ id: 'build-id' });
    expect(request).toHaveBeenCalledTimes(2);
    expect(Fs.readFileSync(Path.join(root, 'calls'), 'utf8').trim().split('\n')).toHaveLength(2);
  });

  it('preserves legacy hostname and token configuration', async () => {
    await new CiStatsClient({ baseUrl: 'ci-stats.example', token: 'upstream-token' }).createBuild();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://ci-stats.example',
        headers: { Authorization: 'token upstream-token' },
      })
    );
    expect(Fs.readFileSync(Path.join(root, 'calls'), 'utf8')).toBe('');
  });

  it('uses the endpoint and auth mode exported by job setup', async () => {
    process.env.CI_STATS_API_URL = 'https://broker.example/proxy/kibana.ci_stats';
    process.env.CI_STATS_AUTH_TYPE = 'buildkite_oidc';
    await new CiStatsClient().createBuild();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: process.env.CI_STATS_API_URL,
        headers: { Authorization: 'Bearer mock-oidc-token' },
      })
    );
  });
});
