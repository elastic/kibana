/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RunGhApi } from './gh_issue_tracker';
import { createGhIssueTracker } from './gh_issue_tracker';

describe('createGhIssueTracker', () => {
  it('lists the labelled issues of every page, one per line', async () => {
    const ghApi: RunGhApi = jest.fn(
      async () =>
        '{"number":1,"state":"open","body":"a","html_url":"u1"}\n{"number":2,"state":"closed","body":null,"html_url":"u2"}\n'
    );
    const issues = await createGhIssueTracker('elastic/kibana', ghApi).list();

    expect(issues).toEqual([
      { number: 1, state: 'open', body: 'a', url: 'u1' },
      { number: 2, state: 'closed', body: '', url: 'u2' },
    ]);
    expect(ghApi).toHaveBeenCalledWith([
      '--paginate',
      'repos/elastic/kibana/issues?labels=connector-validation&state=all&per_page=100',
      '--jq',
      '.[] | select(.pull_request == null) | {number, state, body, html_url}',
    ]);
  });

  it('creates, updates and comments with a JSON body', async () => {
    const ghApi: RunGhApi = jest.fn(
      async () => '{"number":5,"state":"open","body":"b","html_url":"u5"}'
    );
    const tracker = createGhIssueTracker('elastic/kibana', ghApi);

    await expect(tracker.create({ title: 't', body: 'b', labels: ['l'] })).resolves.toEqual({
      number: 5,
      state: 'open',
      body: 'b',
      url: 'u5',
    });
    await tracker.update(5, { state: 'closed' });
    await tracker.comment(5, 'c');

    expect(ghApi).toHaveBeenCalledWith(['-X', 'POST', 'repos/elastic/kibana/issues'], {
      title: 't',
      body: 'b',
      labels: ['l'],
    });
    expect(ghApi).toHaveBeenCalledWith(['-X', 'PATCH', 'repos/elastic/kibana/issues/5'], {
      state: 'closed',
    });
    expect(ghApi).toHaveBeenCalledWith(['-X', 'POST', 'repos/elastic/kibana/issues/5/comments'], {
      body: 'c',
    });
  });
});
