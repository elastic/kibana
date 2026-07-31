/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';

import { GithubApi } from './github_api';

const log = new ToolingLog();

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GithubApi#getIssueComments()', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('follows pagination until a short page and normalizes missing bodies', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ body: `comment ${i}` }));
    const page2 = [{ body: 'last comment' }, {}];

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (url) =>
        jsonResponse(new URL(String(url)).searchParams.get('page') === '1' ? page1 : page2)
      );

    const api = new GithubApi({ log, token: 'secret', dryRun: false });
    const comments = await api.getIssueComments(1234);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls[0]).toContain('issues/1234/comments?per_page=100&page=1');
    expect(requestedUrls[1]).toContain('issues/1234/comments?per_page=100&page=2');

    expect(comments).toHaveLength(102);
    expect(comments[0]).toEqual({ body: 'comment 0' });
    expect(comments[100]).toEqual({ body: 'last comment' });
    expect(comments[101]).toEqual({ body: '' });
  });

  it('stops after a single page when it is not full', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse([{ body: 'only comment' }]));

    const api = new GithubApi({ log, token: 'secret', dryRun: false });
    const comments = await api.getIssueComments(42);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(comments).toEqual([{ body: 'only comment' }]);
  });

  it('returns an empty list without requests in dry-run mode', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    const api = new GithubApi({ log, token: undefined, dryRun: true });

    expect(await api.getIssueComments(42)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
