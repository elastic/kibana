/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeTimelineEvent, toTimelinePage } from './timeline';

const NEXT_LINK =
  '<https://api.github.com/repositories/1/issues/10/timeline?per_page=100&page=2>; rel="next", <https://api.github.com/repositories/1/issues/10/timeline?per_page=100&page=3>; rel="last"';
const PREV_LINK =
  '<https://api.github.com/repositories/1/issues/10/timeline?per_page=100&page=1>; rel="prev", <https://api.github.com/repositories/1/issues/10/timeline?per_page=100&page=1>; rel="first"';

describe('normalizeTimelineEvent', () => {
  it('maps a labeled event', () => {
    expect(
      normalizeTimelineEvent({
        id: 101,
        event: 'labeled',
        created_at: '2026-08-18T12:35:49Z',
        actor: { login: 'octocat' },
        label: { name: 'impact:medium', color: 'fff53a' },
      })
    ).toStrictEqual({
      id: 101,
      event: 'labeled',
      createdAt: '2026-08-18T12:35:49Z',
      actor: 'octocat',
      label: 'impact:medium',
    });
  });

  it('maps an unlabeled event', () => {
    expect(
      normalizeTimelineEvent({
        id: 102,
        event: 'unlabeled',
        created_at: '2026-08-24T09:10:00Z',
        actor: { login: 'dev-user' },
        label: { name: 'impact:medium' },
      })
    ).toStrictEqual({
      id: 102,
      event: 'unlabeled',
      createdAt: '2026-08-24T09:10:00Z',
      actor: 'dev-user',
      label: 'impact:medium',
    });
  });

  it('maps the close reason and the closing commit', () => {
    expect(
      normalizeTimelineEvent({
        id: 103,
        event: 'closed',
        created_at: '2026-08-30T10:00:00Z',
        actor: { login: 'dev' },
        state_reason: 'completed',
        commit_id: 'abc123',
      })
    ).toStrictEqual({
      id: 103,
      event: 'closed',
      createdAt: '2026-08-30T10:00:00Z',
      actor: 'dev',
      stateReason: 'completed',
      commitId: 'abc123',
    });
  });

  it('drops null values instead of returning them', () => {
    expect(
      normalizeTimelineEvent({
        id: 104,
        event: 'closed',
        created_at: '2026-08-30T10:00:00Z',
        actor: { login: 'dev' },
        state_reason: null,
        commit_id: null,
      })
    ).toStrictEqual({
      id: 104,
      event: 'closed',
      createdAt: '2026-08-30T10:00:00Z',
      actor: 'dev',
    });
  });

  it('maps a cross-reference from an issue in another repository, without an id', () => {
    expect(
      normalizeTimelineEvent({
        event: 'cross-referenced',
        created_at: '2026-08-14T08:00:00Z',
        actor: { login: 'dev' },
        source: {
          type: 'issue',
          issue: {
            number: 285243,
            html_url: 'https://github.com/elastic/kibana/issues/285243',
            repository: { full_name: 'elastic/kibana' },
          },
        },
      })
    ).toStrictEqual({
      event: 'cross-referenced',
      createdAt: '2026-08-14T08:00:00Z',
      actor: 'dev',
      source: {
        repo: 'elastic/kibana',
        number: 285243,
        isPullRequest: false,
        url: 'https://github.com/elastic/kibana/issues/285243',
      },
    });
  });

  it('flags a cross-reference from a pull request', () => {
    const event = normalizeTimelineEvent({
      event: 'cross-referenced',
      created_at: '2026-08-14T08:00:00Z',
      actor: { login: 'dev' },
      source: {
        type: 'issue',
        issue: {
          number: 7,
          html_url: 'https://github.com/elastic/kibana/pull/7',
          repository: { full_name: 'elastic/kibana' },
          pull_request: { url: 'https://api.github.com/repos/elastic/kibana/pulls/7' },
        },
      },
    });

    expect(event?.source).toStrictEqual({
      repo: 'elastic/kibana',
      number: 7,
      isPullRequest: true,
      url: 'https://github.com/elastic/kibana/pull/7',
    });
  });

  it('omits the source when the referencing issue is incomplete', () => {
    const event = normalizeTimelineEvent({
      event: 'cross-referenced',
      created_at: '2026-08-14T08:00:00Z',
      source: { type: 'issue', issue: { number: 7 } },
    });

    expect(event).toStrictEqual({
      event: 'cross-referenced',
      createdAt: '2026-08-14T08:00:00Z',
    });
  });

  it('maps a review request to a user', () => {
    expect(
      normalizeTimelineEvent({
        id: 105,
        event: 'review_requested',
        created_at: '2026-09-01T08:00:00Z',
        actor: { login: 'dev' },
        requested_reviewer: { login: 'monalisa' },
      })
    ).toStrictEqual({
      id: 105,
      event: 'review_requested',
      createdAt: '2026-09-01T08:00:00Z',
      actor: 'dev',
      requestedReviewer: 'monalisa',
    });
  });

  it('maps a review request to a team', () => {
    const event = normalizeTimelineEvent({
      id: 106,
      event: 'review_requested',
      created_at: '2026-09-01T08:00:00Z',
      actor: { login: 'dev' },
      requested_team: { slug: 'security-solution' },
    });

    expect(event?.requestedTeam).toBe('security-solution');
    expect(event?.requestedReviewer).toBeUndefined();
  });

  it('maps a review using the submission time and the reviewer', () => {
    expect(
      normalizeTimelineEvent({
        id: 107,
        event: 'reviewed',
        submitted_at: '2026-09-02T09:30:00Z',
        user: { login: 'monalisa' },
        state: 'approved',
        html_url: 'https://github.com/elastic/kibana/pull/7#pullrequestreview-107',
      })
    ).toStrictEqual({
      id: 107,
      event: 'reviewed',
      createdAt: '2026-09-02T09:30:00Z',
      actor: 'monalisa',
      reviewState: 'approved',
      url: 'https://github.com/elastic/kibana/pull/7#pullrequestreview-107',
    });
  });

  it('maps a comment without its body', () => {
    expect(
      normalizeTimelineEvent({
        id: 108,
        event: 'commented',
        created_at: '2026-09-03T10:00:00Z',
        actor: { login: 'dev' },
        author_association: 'MEMBER',
        html_url: 'https://github.com/elastic/kibana/issues/10#issuecomment-108',
        body: 'a long private comment',
      })
    ).toStrictEqual({
      id: 108,
      event: 'commented',
      createdAt: '2026-09-03T10:00:00Z',
      actor: 'dev',
      authorAssociation: 'MEMBER',
      url: 'https://github.com/elastic/kibana/issues/10#issuecomment-108',
    });
  });

  it.each(['assigned', 'unassigned'])('maps the assignee of an %s event', (event) => {
    expect(
      normalizeTimelineEvent({
        id: 120,
        event,
        created_at: '2026-09-04T09:00:00Z',
        actor: { login: 'octocat' },
        assignee: { login: 'monalisa' },
      })
    ).toStrictEqual({
      id: 120,
      event,
      createdAt: '2026-09-04T09:00:00Z',
      actor: 'octocat',
      assignee: 'monalisa',
    });
  });

  it('maps a rename', () => {
    const event = normalizeTimelineEvent({
      id: 109,
      event: 'renamed',
      created_at: '2026-09-04T10:00:00Z',
      actor: { login: 'dev' },
      rename: { from: 'old title', to: 'new title' },
    });

    expect(event?.rename).toStrictEqual({ from: 'old title', to: 'new title' });
  });

  describe('committed', () => {
    const committed = {
      event: 'committed',
      sha: 'dd48a696bb78f952061410d42b3c874eb48692e4',
      message: 'fix the thing',
      author: { name: 'Jane Smith', email: 'jane@example.com', date: '2026-11-10T05:00:00Z' },
      committer: { name: 'Jane Smith', email: 'jane@example.com', date: '2026-11-10T05:06:31Z' },
    };

    it('takes the time from the committer date and returns the sha', () => {
      expect(normalizeTimelineEvent(committed)).toStrictEqual({
        event: 'committed',
        createdAt: '2026-11-10T05:06:31Z',
        sha: 'dd48a696bb78f952061410d42b3c874eb48692e4',
        authorName: 'Jane Smith',
      });
    });

    it('falls back to the author date', () => {
      expect(normalizeTimelineEvent({ ...committed, committer: undefined })?.createdAt).toBe(
        '2026-11-10T05:00:00Z'
      );
    });

    it('has no actor, no id and no email', () => {
      const event = normalizeTimelineEvent(committed);

      expect(event).not.toHaveProperty('actor');
      expect(event).not.toHaveProperty('id');
      expect(JSON.stringify(event)).not.toContain('jane@example.com');
    });
  });

  it('returns an unknown event type with the base fields only', () => {
    expect(
      normalizeTimelineEvent({
        id: 110,
        event: 'something_new',
        created_at: '2026-09-05T10:00:00Z',
        actor: { login: 'dev' },
        brand_new_field: 42,
      })
    ).toStrictEqual({
      id: 110,
      event: 'something_new',
      createdAt: '2026-09-05T10:00:00Z',
      actor: 'dev',
    });
  });

  it('leaves createdAt out when GitHub gives no timestamp', () => {
    expect(normalizeTimelineEvent({ id: 111, event: 'something_new' })).toStrictEqual({
      id: 111,
      event: 'something_new',
    });
  });

  it.each([{}, { event: 5 }, { id: 1, created_at: '2026-09-05T10:00:00Z' }])(
    'skips an entry without a usable event type: %j',
    (entry) => {
      expect(normalizeTimelineEvent(entry)).toBeUndefined();
    }
  );

  describe('line-commented and commit-commented', () => {
    const firstComment = {
      id: 501,
      created_at: '2026-03-02T10:00:00Z',
      user: { login: 'octocat' },
      html_url: 'https://github.com/elastic/kibana/pull/10#discussion_r501',
      body: 'Not returned',
    };
    const secondComment = {
      id: 502,
      created_at: '2026-03-02T11:00:00Z',
      user: { login: 'monalisa' },
      html_url: 'https://github.com/elastic/kibana/pull/10#discussion_r502',
      body: 'Not returned either',
    };

    it('takes the timestamp, author, id and URL of line-commented from its first comment', () => {
      expect(
        normalizeTimelineEvent({
          event: 'line-commented',
          node_id: 'LC_1',
          comments: [firstComment, secondComment],
        })
      ).toStrictEqual({
        id: 501,
        event: 'line-commented',
        createdAt: '2026-03-02T10:00:00Z',
        actor: 'octocat',
        url: 'https://github.com/elastic/kibana/pull/10#discussion_r501',
        commentCount: 2,
      });
    });

    it('does the same for commit-commented and keeps its commit id', () => {
      expect(
        normalizeTimelineEvent({
          event: 'commit-commented',
          node_id: 'CC_1',
          commit_id: 'abc123',
          comments: [firstComment],
        })
      ).toStrictEqual({
        id: 501,
        event: 'commit-commented',
        createdAt: '2026-03-02T10:00:00Z',
        actor: 'octocat',
        url: 'https://github.com/elastic/kibana/pull/10#discussion_r501',
        commitId: 'abc123',
        commentCount: 1,
      });
    });

    it('never returns the comment bodies', () => {
      const event = normalizeTimelineEvent({
        event: 'line-commented',
        comments: [firstComment, secondComment],
      });

      expect(JSON.stringify(event)).not.toContain('Not returned');
    });

    it('keeps the fields of the entry itself when it has them', () => {
      const event = normalizeTimelineEvent({
        id: 7,
        event: 'line-commented',
        created_at: '2026-03-01T00:00:00Z',
        actor: { login: 'monalisa' },
        html_url: 'https://github.com/elastic/kibana/pull/10#event-7',
        comments: [firstComment],
      });

      expect(event).toMatchObject({
        id: 7,
        createdAt: '2026-03-01T00:00:00Z',
        actor: 'monalisa',
        url: 'https://github.com/elastic/kibana/pull/10#event-7',
        commentCount: 1,
      });
    });

    it('reports zero comments and no borrowed fields for an empty group', () => {
      expect(normalizeTimelineEvent({ event: 'line-commented', comments: [] })).toStrictEqual({
        event: 'line-commented',
        commentCount: 0,
      });
    });

    it('skips a malformed comment and uses the next one', () => {
      const event = normalizeTimelineEvent({
        event: 'line-commented',
        comments: ['not a comment', secondComment],
      });

      expect(event).toMatchObject({ id: 502, actor: 'monalisa', commentCount: 2 });
    });

    it('keeps the event when comments is not an array', () => {
      expect(normalizeTimelineEvent({ event: 'line-commented', comments: 'nope' })).toStrictEqual({
        event: 'line-commented',
      });
    });

    it('sets no commentCount on events that have no comments array', () => {
      expect(normalizeTimelineEvent({ id: 1, event: 'labeled' })).not.toHaveProperty(
        'commentCount'
      );
    });
  });

  describe('with a field of an unexpected type', () => {
    it('keeps the event and drops only that field', () => {
      expect(
        normalizeTimelineEvent({
          id: 'not-a-number',
          event: 'labeled',
          created_at: '2026-08-18T12:35:49Z',
          actor: { login: 'dev' },
          label: { name: 'bug' },
        })
      ).toStrictEqual({
        event: 'labeled',
        createdAt: '2026-08-18T12:35:49Z',
        actor: 'dev',
        label: 'bug',
      });
    });

    it('keeps the event when a nested object has the wrong shape', () => {
      expect(
        normalizeTimelineEvent({
          id: 1,
          event: 'labeled',
          created_at: '2026-08-18T12:35:49Z',
          actor: 'dev',
          label: { name: 'bug' },
        })
      ).toStrictEqual({
        id: 1,
        event: 'labeled',
        createdAt: '2026-08-18T12:35:49Z',
        label: 'bug',
      });
    });

    it('keeps the event when a nested field has the wrong type', () => {
      expect(
        normalizeTimelineEvent({
          id: 1,
          event: 'labeled',
          created_at: '2026-08-18T12:35:49Z',
          actor: { login: 'dev' },
          label: { name: 5 },
        })
      ).toStrictEqual({
        id: 1,
        event: 'labeled',
        createdAt: '2026-08-18T12:35:49Z',
        actor: 'dev',
      });
    });
  });
});

describe('toTimelinePage', () => {
  const events = [
    {
      id: 1,
      event: 'subscribed',
      created_at: '2026-08-18T12:00:00Z',
      actor: { login: 'dev' },
    },
    {
      id: 2,
      event: 'labeled',
      created_at: '2026-08-18T12:01:00Z',
      actor: { login: 'dev' },
      label: { name: 'bug' },
    },
    { id: 3, event: 'closed', created_at: '2026-08-19T12:00:00Z', actor: { login: 'dev' } },
  ];

  it('returns every event in the order GitHub sent them', () => {
    const page = toTimelinePage({ data: events, headers: {} }, { page: 1 });

    expect(page.events.map(({ id }) => id)).toEqual([1, 2, 3]);
  });

  it('skips entries without a usable event type', () => {
    const page = toTimelinePage({ data: [{}, { event: 5 }, ...events], headers: {} }, { page: 1 });

    expect(page.events).toHaveLength(3);
  });

  it('keeps only the requested event types', () => {
    const page = toTimelinePage(
      { data: events, headers: {} },
      { page: 1, eventTypes: ['labeled', 'closed'] }
    );

    expect(page.events.map(({ event }) => event)).toEqual(['labeled', 'closed']);
  });

  it('can return an empty page while more pages remain', () => {
    const page = toTimelinePage(
      { data: events, headers: { link: NEXT_LINK } },
      { page: 1, eventTypes: ['reviewed'] }
    );

    expect(page).toStrictEqual({ events: [], page: 1, nextPage: 2, lastPage: 3, hasMore: true });
  });

  describe('lastPage', () => {
    it('is the page of rel="last" in the Link header', () => {
      const page = toTimelinePage({ data: events, headers: { link: NEXT_LINK } }, { page: 1 });

      expect(page.lastPage).toBe(3);
    });

    it('is the current page when it has events and no next page', () => {
      const withPrev = toTimelinePage({ data: events, headers: { link: PREV_LINK } }, { page: 3 });
      const single = toTimelinePage({ data: events, headers: {} }, { page: 1 });

      expect(withPrev.lastPage).toBe(3);
      expect(single.lastPage).toBe(1);
    });

    it('is null for an empty page past the end', () => {
      const page = toTimelinePage({ data: [], headers: { link: PREV_LINK } }, { page: 9 });

      expect(page.lastPage).toBeNull();
    });

    it('is null when more pages remain and GitHub sends no rel="last"', () => {
      const link = '<https://api.github.com/repositories/1/issues/10/timeline?page=2>; rel="next"';
      const page = toTimelinePage({ data: events, headers: { link } }, { page: 1 });

      expect(page).toMatchObject({ hasMore: true, lastPage: null });
    });

    it.each([
      '<https://api.github.com/repositories/1/issues/10/timeline>; rel="last"',
      '<https://api.github.com/repositories/1/issues/10/timeline?page=abc>; rel="last"',
      '<https://api.github.com/repositories/1/issues/10/timeline?page=0>; rel="last"',
      '<http://[>; rel="last"',
    ])('ignores a rel="last" link without a usable page number: %s', (last) => {
      const link = `<https://api.github.com/repositories/1/issues/10/timeline?page=2>; rel="next", ${last}`;
      const page = toTimelinePage({ data: events, headers: { link } }, { page: 1 });

      expect(page.lastPage).toBeNull();
    });
  });

  it('reports the next page when the Link header has rel="next"', () => {
    const page = toTimelinePage({ data: events, headers: { link: NEXT_LINK } }, { page: 1 });

    expect(page).toMatchObject({ page: 1, nextPage: 2, hasMore: true });
  });

  it('takes the next page from the rel="next" link, not from the requested page', () => {
    const link = '<https://api.github.com/repositories/1/issues/10/timeline?page=7>; rel="next"';
    const page = toTimelinePage({ data: events, headers: { link } }, { page: 4 });

    expect(page).toMatchObject({ page: 4, nextPage: 7, hasMore: true });
  });

  it.each([
    '<https://api.github.com/repositories/1/issues/10/timeline>; rel="next"',
    '<https://api.github.com/repositories/1/issues/10/timeline?page=abc>; rel="next"',
    '<http://[>; rel="next"',
  ])('reports no more pages for a rel="next" link without a usable page number: %s', (link) => {
    const page = toTimelinePage({ data: events, headers: { link } }, { page: 1 });

    expect(page).toMatchObject({ nextPage: null, hasMore: false });
  });

  it('reports no more pages when the Link header has no rel="next"', () => {
    const page = toTimelinePage({ data: events, headers: { link: PREV_LINK } }, { page: 3 });

    expect(page).toMatchObject({ page: 3, nextPage: null, hasMore: false });
  });

  it('reports no more pages when there is no Link header', () => {
    const page = toTimelinePage({ data: events, headers: {} }, { page: 1 });

    expect(page).toMatchObject({ nextPage: null, hasMore: false });
  });
});
