/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';

import { GithubApi, nextPageUrl } from './github_api';

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

describe('nextPageUrl()', () => {
  it('returns the rel="next" link', () => {
    expect(
      nextPageUrl(
        '<https://api.github.com/repositories/1/issues?page=2>; rel="next", <https://api.github.com/repositories/1/issues?page=16>; rel="last"'
      )
    ).toBe('https://api.github.com/repositories/1/issues?page=2');
  });

  it('is undefined on the last page or without a Link header', () => {
    expect(
      nextPageUrl(
        '<https://api.github.com/repositories/1/issues?page=15>; rel="prev", <https://api.github.com/repositories/1/issues?page=1>; rel="first"'
      )
    ).toBeUndefined();
    expect(nextPageUrl(null)).toBeUndefined();
  });
});

describe('GithubApi#searchIssues()', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const issue = (number: number, extra: Record<string, unknown> = {}) => ({
    number,
    html_url: `https://github.com/elastic/kibana/issues/${number}`,
    node_id: `n${number}`,
    title: `#${number}`,
    labels: [],
    body: `body ${number}`,
    state: 'open',
    ...extra,
  });

  const page = (items: unknown[], nextUrl?: string) =>
    new Response(JSON.stringify({ total_count: items.length, incomplete_results: false, items }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...(nextUrl ? { Link: `<${nextUrl}>; rel="next"` } : {}),
      },
    });

  it('scopes the query to the repository and unwraps the items', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => page([issue(5), issue(6)]));

    const api = new GithubApi({ log, token: 'secret', dryRun: false, repo: 'elastic/sandbox' });
    const issues = await api.searchIssues({ query: 'label:failed-test "a.ts" OR "b.ts"' });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe('https://api.github.com/search/issues');
    expect(url.searchParams.get('q')).toBe(
      'repo:elastic/sandbox is:issue label:failed-test "a.ts" OR "b.ts"'
    );
    expect(url.searchParams.get('per_page')).toBe('100');
    expect(issues.map(({ number }) => number)).toEqual([5, 6]);
  });

  it('follows the Link header, drops pull requests and normalizes missing bodies', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (new URL(String(url)).searchParams.get('page') === '2') {
        return page([issue(3, { body: null })]);
      }
      // A short first page that is not the last one
      return page(
        [issue(1), issue(2, { pull_request: {} })],
        'https://api.github.com/search/issues?q=x&per_page=100&page=2'
      );
    });

    const api = new GithubApi({ log, token: 'secret', dryRun: false });
    const issues = await api.searchIssues({ query: 'x' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(issues.map(({ number, body }) => [number, body])).toEqual([
      [1, 'body 1'],
      [3, ''],
    ]);
  });

  it('still fetches in dry-run mode because searching is read-only', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async () => page([issue(1)]));

    const api = new GithubApi({ log, token: undefined, dryRun: true });
    const issues = await api.searchIssues({ query: 'x' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(issues).toHaveLength(1);
  });

  it('stops after maxPages and warns', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () =>
        page([issue(1)], 'https://api.github.com/search/issues?q=x&page=99')
      );
    const warning = jest.spyOn(log, 'warning').mockImplementation(() => {});

    const api = new GithubApi({ log, token: 'secret', dryRun: false });
    const issues = await api.searchIssues({ query: 'x', maxPages: 2 });

    expect(issues).toHaveLength(2);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('results are incomplete'));
  });

  it('waits and retries when rate limited', async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementationOnce(
        async () => new Response('rate limited', { status: 403, headers: { 'Retry-After': '7' } })
      )
      .mockImplementationOnce(async () => page([issue(1)]));
    jest.spyOn(log, 'warning').mockImplementation(() => {});

    const api = new GithubApi({ log, token: 'secret', dryRun: false });
    const pending = api.searchIssues({ query: 'x' });
    await jest.advanceTimersByTimeAsync(7000);
    const issues = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(issues).toHaveLength(1);
    jest.useRealTimers();
  });
});
