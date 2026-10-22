/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { fetchFinishedBuilds } from './buildkite_builds';

const log = new ToolingLog();

const response = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body } as Response);

describe('fetchFinishedBuilds', () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('asks Buildkite for each build and keeps the finished ones', async () => {
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('/builds/101')
        ? response(200, { state: 'failed', finished_at: '2026-10-16T10:00:00.000Z' })
        : response(200, { state: 'running', finished_at: null })
    );

    const finished = await fetchFinishedBuilds('kibana-on-merge', [101, 102], log, 'token');

    expect(finished).toEqual(new Set([101]));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.buildkite.com/v2/organizations/elastic/pipelines/kibana-on-merge/builds/101',
      { headers: { Authorization: 'Bearer token' } }
    );
  });

  it('leaves a build pending when Buildkite cannot be asked', async () => {
    fetchMock
      .mockResolvedValueOnce(response(404, {}))
      .mockRejectedValueOnce(new Error('connection reset'));

    expect(await fetchFinishedBuilds('kibana-on-merge', [101, 102], log, 'token')).toEqual(
      new Set()
    );
  });

  it('asks nothing without builds or without a token', async () => {
    expect(await fetchFinishedBuilds('kibana-on-merge', [], log, 'token')).toEqual(new Set());
    expect(await fetchFinishedBuilds('kibana-on-merge', [101], log, undefined)).toEqual(new Set());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
