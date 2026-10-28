/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorDrift, DriftReportEntry } from './detect_drift';
import type { DriftIssue, IssueTracker, SurfaceDriftOptions } from './surface_drift';
import {
  DRIFT_ISSUE_LABEL,
  renderDriftIssue,
  renderRefreshPr,
  surfaceDrift,
} from './surface_drift';

const healthy: ConnectorDrift = {
  connector: '.acme',
  sources: { main: { status: 'unchanged' } },
  operationsChanged: false,
  snapshotProblems: [],
  latestProblems: [],
  verdict: 'healthy',
  overlayFindings: [],
  outcome: 'none',
};

const drifted: ConnectorDrift = {
  ...healthy,
  sources: {
    main: {
      status: 'changed',
      changes: [
        {
          kind: 'breaking',
          id: 'request-parameter-max-decreased',
          text: 'decreased the max of `limit` to 50',
          operation: 'GET /items',
        },
        { kind: 'non-breaking', id: 'response-optional-property-added', text: 'added `title`' },
      ],
    },
  },
  latestProblems: ['search: GET /items: limit must be <= 50'],
  verdict: 'vendor-drift',
  outcome: 'issue',
};

const refreshable: ConnectorDrift = {
  ...healthy,
  connector: '.other',
  sources: {
    main: {
      status: 'changed',
      changes: [
        { kind: 'non-breaking', id: 'response-optional-property-added', text: 'added `title`' },
      ],
    },
  },
  outcome: 'refresh',
};

const createTracker = (initial: DriftIssue[] = []) => {
  const issues = [...initial];
  const comments: Array<[number, string]> = [];
  const tracker: IssueTracker = {
    list: jest.fn(async () => issues),
    create: jest.fn(async ({ body }) => {
      const issue: DriftIssue = { number: 100 + issues.length, state: 'open', body, url: 'url' };
      issues.push(issue);
      return issue;
    }),
    update: jest.fn(async (number, changes) => {
      const index = issues.findIndex((issue) => issue.number === number);
      issues[index] = { ...issues[index], ...changes };
    }),
    comment: jest.fn(async (number, body) => {
      comments.push([number, body]);
    }),
  };
  return { tracker, issues, comments };
};

const surface = (
  report: DriftReportEntry[],
  tracker: IssueTracker,
  options: Partial<SurfaceDriftOptions> = {}
) =>
  surfaceDrift({
    report,
    tracker,
    repo: 'elastic/kibana',
    dryRun: false,
    ownersOf: () => ['@elastic/response-ops'],
    buildUrl: 'https://buildkite.com/build/1',
    log: { info: () => {}, warning: () => {} },
    ...options,
  });

const issueOf = (drift: ConnectorDrift, number: number, state: 'open' | 'closed'): DriftIssue => ({
  number,
  state,
  body: renderDriftIssue(drift, ['@elastic/response-ops']).body,
  url: `url/${number}`,
});

describe('surfaceDrift', () => {
  it('files an issue for a connector that needs one, labelled and mentioning its owners', async () => {
    const { tracker, issues } = createTracker();
    const { actions } = await surface([drifted], tracker);

    expect(actions).toEqual([
      { connector: '.acme', action: 'created', issue: expect.objectContaining({ number: 100 }) },
    ]);
    expect(tracker.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '[Connector validation] Vendor API drift in .acme',
        labels: [DRIFT_ISSUE_LABEL],
      })
    );
    expect(issues[0].body).toContain('cc @elastic/response-ops');
  });

  it('files no duplicate on the next run with the same findings', async () => {
    const { tracker } = createTracker();
    await surface([drifted], tracker);
    const { actions } = await surface([drifted], tracker);

    expect(actions[0].action).toBe('unchanged');
    expect(tracker.create).toHaveBeenCalledTimes(1);
    expect(tracker.update).not.toHaveBeenCalled();
  });

  it('updates the open issue and comments when the findings change', async () => {
    const { tracker, issues, comments } = createTracker([issueOf(drifted, 7, 'open')]);
    const changed: ConnectorDrift = { ...drifted, latestProblems: ['another problem'] };
    const { actions } = await surface([changed], tracker);

    expect(actions[0]).toMatchObject({ action: 'updated', issue: { number: 7 } });
    expect(issues[0].body).toContain('another problem');
    expect(comments).toEqual([[7, expect.stringContaining('https://buildkite.com/build/1')]]);
  });

  it('reopens a closed issue when the connector drifts again', async () => {
    const { tracker, issues } = createTracker([issueOf(drifted, 7, 'closed')]);
    const { actions } = await surface([drifted], tracker);

    expect(actions[0]).toMatchObject({ action: 'reopened', issue: { number: 7 } });
    expect(issues[0].state).toBe('open');
    expect(tracker.create).not.toHaveBeenCalled();
  });

  it('prefers the open issue over older closed ones', async () => {
    const { tracker } = createTracker([issueOf(drifted, 9, 'closed'), issueOf(drifted, 7, 'open')]);
    const { actions } = await surface([drifted], tracker);

    expect(actions[0]).toMatchObject({ action: 'unchanged', issue: { number: 7 } });
  });

  it('closes the issue of a connector that is healthy again', async () => {
    const { tracker, issues, comments } = createTracker([issueOf(drifted, 7, 'open')]);
    const { actions } = await surface([healthy], tracker);

    expect(actions[0]).toMatchObject({ action: 'closed', issue: { number: 7 } });
    expect(issues[0].state).toBe('closed');
    expect(comments[0][1]).toContain('healthy');
  });

  it('leaves the issues of other connectors alone', async () => {
    const { tracker } = createTracker([
      { number: 3, state: 'open', body: renderDriftIssue(refreshable, []).body, url: 'url' },
    ]);
    const { actions } = await surface([healthy], tracker);

    expect(actions[0].action).toBe('none');
    expect(tracker.update).not.toHaveBeenCalled();
  });

  it('lists connectors that only need a refresh for the refresh PR', async () => {
    const { tracker } = createTracker();
    const summary = await surface([healthy, refreshable], tracker);

    expect(summary.refresh).toEqual(['.other']);
    expect(summary.refreshPrBody).toContain('### `.other`');
    expect(tracker.create).not.toHaveBeenCalled();
  });

  it('reports connectors the check failed on, and failed GitHub writes, without stopping', async () => {
    const { tracker } = createTracker();
    const failing: IssueTracker = {
      ...tracker,
      create: async () => {
        throw new Error('403');
      },
    };
    const { actions } = await surface(
      [{ connector: '.broken', error: 'no manifest' }, drifted, refreshable],
      failing
    );

    expect(actions).toEqual([
      { connector: '.broken', action: 'failed', error: 'no manifest' },
      { connector: '.acme', action: 'failed', error: '403' },
      { connector: '.other', action: 'refresh' },
    ]);
  });

  it('only reads in a dry run', async () => {
    const { tracker } = createTracker([issueOf(healthy, 7, 'open')]);
    const info = jest.fn();
    const { actions } = await surface([drifted, { ...healthy, connector: '.gone' }], tracker, {
      dryRun: true,
      log: { info, warning: () => {} },
    });

    expect(actions.map(({ action }) => action)).toEqual(['updated', 'none']);
    expect(tracker.update).not.toHaveBeenCalled();
    expect(tracker.comment).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith('Would update #7 for .acme');
  });
});

describe('renderDriftIssue', () => {
  it('reports the two-mock result, the classified changes and how to reproduce', () => {
    const { body } = renderDriftIssue(drifted, []);

    expect(body).toContain('**Two-mock result:** vendor drift');
    expect(body).toContain(
      '- `GET /items`: decreased the max of `limit` to 50 (`request-parameter-max-decreased`)'
    );
    expect(body).toContain('<details><summary>1 non-breaking change(s)</summary>');
    expect(body).toContain('- search: GET /items: limit must be <= 50');
    expect(body).toContain('node scripts/connector_vendor_api --drift --connector acme');
    expect(body).not.toContain('cc ');
  });

  it('reports unreachable sources and caps long change lists', () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
      kind: 'breaking' as const,
      id: 'api-removed',
      text: `removed ${index}`,
    }));
    const { body } = renderDriftIssue(
      {
        ...drifted,
        sources: {
          main: { status: 'changed', changes: many },
          extra: { status: 'unreachable', error: '404 Not Found' },
        },
      },
      []
    );

    expect(body).toContain('- …and 10 more');
    expect(body).toContain('#### `extra`: unreachable');
    expect(body).toContain('`404 Not Found`');
  });
});

describe('renderRefreshPr', () => {
  it('lists the changes per connector', () => {
    expect(
      renderRefreshPr([
        refreshable,
        { ...refreshable, connector: '.moved', sources: {}, operationsChanged: true },
      ])
    ).toContain('- main: added `title` (`response-optional-property-added`)');
  });
});
