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

describe('GithubApi#listIssues()', () => {
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

  it('follows the Link header, drops pull requests and normalizes missing bodies', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const page = new URL(String(url)).searchParams.get('page');
      if (page === '2') {
        return jsonResponse([issue(3, { body: null })]);
      }
      // A short first page that is not the last one
      return new Response(JSON.stringify([issue(1), issue(2, { pull_request: {} })]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          Link: '<https://api.github.com/repos/elastic/kibana/issues?labels=failed-test&state=open&per_page=100&page=2>; rel="next"',
        },
      });
    });

    const api = new GithubApi({ log, token: 'secret', dryRun: false });
    const issues = await api.listIssues({ labels: ['failed-test'], state: 'open' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://api.github.com/repos/elastic/kibana/issues?labels=failed-test&state=open&per_page=100'
    );
    expect(issues.map(({ number, body }) => [number, body])).toEqual([
      [1, 'body 1'],
      [3, ''],
    ]);
  });

  it('still fetches in dry-run mode because listing is read-only', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => jsonResponse([issue(1)]));

    const api = new GithubApi({ log, token: undefined, dryRun: true });
    const issues = await api.listIssues({ labels: ['failed-test'], state: 'all' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(issues).toHaveLength(1);
  });

  it('searches issues scoped to the repository and unwraps the items', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async () =>
      jsonResponse({
        total_count: 2,
        incomplete_results: false,
        items: [issue(5), issue(6, { pull_request: {} })],
      })
    );

    const api = new GithubApi({ log, token: 'secret', dryRun: false, repo: 'elastic/sandbox' });
    const issues = await api.searchIssues({
      query: 'label:failed-test in:title "Flaky test suite"',
    });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe('https://api.github.com/search/issues');
    expect(url.searchParams.get('q')).toBe(
      'repo:elastic/sandbox is:issue label:failed-test in:title "Flaky test suite"'
    );
    expect(url.searchParams.get('sort')).toBe('updated');
    expect(issues.map(({ number }) => number)).toEqual([5]);
  });

  it('stops after maxPages and warns', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify([issue(1)]), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            Link: '<https://api.github.com/repos/elastic/kibana/issues?page=99>; rel="next"',
          },
        })
    );
    const warning = jest.spyOn(log, 'warning').mockImplementation(() => {});

    const api = new GithubApi({ log, token: 'secret', dryRun: false });
    const issues = await api.listIssues({ labels: ['failed-test'], state: 'open', maxPages: 2 });

    expect(issues).toHaveLength(2);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('results are incomplete'));
  });
});
