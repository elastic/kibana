/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDrift, ConnectorDrift, DriftReportEntry, SpecChange } from './detect_drift';
import { DRIFT_ISSUE_LABEL } from './issue_marker';
import { drifted, healthy } from './drift_fixtures';
import { renderDriftIssue } from './issue';
import type { DriftIssue, IssueTracker, SurfaceDriftOptions } from './surface_drift';
import { renderRefreshPr, surfaceDrift } from './surface_drift';

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
    create: jest.fn(async ({ title, body }) => {
      const issue: DriftIssue = {
        number: 100 + issues.length,
        state: 'open',
        title,
        body,
        url: 'url',
      };
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
    ownersOf: () => ['elastic/response-ops'],
    knownConnectors: new Set(['.acme', '.other']),
    buildUrl: 'https://buildkite.com/build/1',
    log: { info: () => {}, warning: () => {} },
    ...options,
  });

const issueOf = (drift: ConnectorDrift, number: number, state: 'open' | 'closed'): DriftIssue => ({
  number,
  state,
  ...renderDriftIssue(drift, {
    owners: ['elastic/response-ops'],
    buildUrl: 'https://buildkite.com/build/1',
  }),
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
        title: '[Connectors][Validation] `.acme`: 1 action needs attention',
        labels: [DRIFT_ISSUE_LABEL],
      })
    );
    expect(issues[0].body).toContain('cc @elastic/response-ops');
    expect(issues[0].body).toContain('([build](https://buildkite.com/build/1))');
  });

  it('files no duplicate on the next run with the same findings', async () => {
    const { tracker } = createTracker();
    await surface([drifted], tracker);
    const { actions } = await surface([drifted], tracker);

    expect(actions[0].action).toBe('unchanged');
    expect(tracker.create).toHaveBeenCalledTimes(1);
    expect(tracker.update).not.toHaveBeenCalled();
  });

  it('refreshes when the issue was last checked without commenting, when only that changed', async () => {
    const { tracker, issues, comments } = createTracker([issueOf(drifted, 7, 'open')]);
    const nextWeek: ConnectorDrift = { ...drifted, checkedAt: '2026-11-23T06:00:00.000Z' };

    const { actions } = await surface([nextWeek], tracker, {
      buildUrl: 'https://buildkite.com/build/2',
    });

    expect(actions[0]).toMatchObject({ action: 'unchanged', issue: { number: 7 } });
    expect(comments).toEqual([]);
    expect(issues[0].body).toContain('2026-11-23 ([build](https://buildkite.com/build/2))');
  });

  it('updates the open issue, its title included, and comments when the findings change', async () => {
    const { tracker, issues, comments } = createTracker([issueOf(drifted, 7, 'open')]);
    const changed: ConnectorDrift = {
      ...drifted,
      actions: drifted.actions?.map((action) => ({
        ...action,
        latestProblems: ['another problem'],
      })),
    };
    const { actions } = await surface([changed], tracker);

    expect(actions[0]).toMatchObject({ action: 'updated', issue: { number: 7 } });
    expect(issues[0].body).toContain('another problem');
    expect(issues[0].title).toBe('[Connectors][Validation] `.acme`: 2 actions need attention');
    expect(comments).toEqual([[7, expect.stringContaining('https://buildkite.com/build/1')]]);
  });

  it('updates the issue when only its title differs', async () => {
    const { tracker, issues } = createTracker([
      { ...issueOf(drifted, 7, 'open'), title: '[Connector validation] Vendor API drift in .acme' },
    ]);
    const { actions } = await surface([drifted], tracker);

    expect(actions[0].action).toBe('updated');
    expect(issues[0].title).toBe('[Connectors][Validation] `.acme`: 1 action needs attention');
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

  it('closes the issue of a connector that only needs a refresh, without calling it healthy', async () => {
    const { tracker, issues, comments } = createTracker([
      issueOf({ ...drifted, connector: '.other' }, 7, 'open'),
    ]);
    const { actions } = await surface([refreshable], tracker);

    expect(actions[0]).toMatchObject({ action: 'closed', issue: { number: 7 } });
    expect(issues[0].state).toBe('closed');
    expect(comments[0][1]).toContain('refresh PR');
    expect(comments[0][1]).not.toContain('healthy');
  });

  it('closes the open issue of a connector that no longer exists', async () => {
    const { tracker, issues, comments } = createTracker([
      issueOf({ ...drifted, connector: '.removed' }, 7, 'open'),
    ]);
    const { actions } = await surface([healthy], tracker);

    expect(actions[1]).toMatchObject({
      connector: '.removed',
      action: 'closed',
      issue: { number: 7 },
    });
    expect(issues[0].state).toBe('closed');
    expect(comments[0][1]).toContain('.removed');
  });

  it('ignores labelled issues without a marker and closed issues of removed connectors', async () => {
    const { tracker } = createTracker([
      { number: 3, state: 'open', title: 'By hand', body: 'Filed by hand', url: 'url' },
      issueOf({ ...drifted, connector: '.removed' }, 7, 'closed'),
    ]);
    const { actions } = await surface([], tracker);

    expect(actions).toEqual([]);
    expect(tracker.update).not.toHaveBeenCalled();
  });

  it('leaves the issues of other connectors alone', async () => {
    const { tracker } = createTracker([issueOf(refreshable, 3, 'open')]);
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

// Sentry's spec moved `/api/0` from its paths into its server URL, which an overlay correction

describe('renderRefreshPr', () => {
  const added = (
    operation: string | undefined,
    text: string,
    id = 'response-optional-property-added'
  ): SpecChange => ({
    kind: 'non-breaking',
    id,
    text,
    ...(operation ? { operation } : {}),
  });
  const field = (operation: string | undefined, name: string): SpecChange =>
    added(operation, `added the optional property \`${name}\` to the response`);
  const calling = (action: string, ...operations: string[]): ActionDrift => ({
    action,
    operations: operations.map((operation) => ({ source: 'main', operation })),
    unmatched: [],
    snapshotProblems: [],
  });
  const changed = (
    connector: string,
    changes: SpecChange[],
    actions: ActionDrift[] = []
  ): ConnectorDrift => ({
    ...refreshable,
    connector,
    sources: { main: { status: 'changed', changes } },
    actions,
  });

  it('writes one table per connector with the endpoint, what changed and the actions using it', () => {
    const body = renderRefreshPr([
      changed(
        '.other',
        [field('GET /a', 'title'), field('GET /b', 'name')],
        [calling('listA', 'GET /a'), calling('getA', 'GET /a'), calling('listB', 'GET /b')]
      ),
    ]);

    expect(body).toContain(
      [
        '### `.other`',
        '',
        '<table>',
        '<tr><th>Endpoint</th><th>What changed</th><th>Used in action</th></tr>',
        '<tr>',
        '<td>',
        '',
        '`GET /a`',
        '',
        '</td>',
        '<td>',
        '',
        '```diff',
        '+ response field title',
        '```',
        '',
        '</td>',
        '<td>',
        '',
        '`getA` and `listA`',
        '',
        '</td>',
        '</tr>',
      ].join('\n')
    );
    expect(body).toContain('+ response field name\n```');
    expect(body).toContain('`listB`');
  });

  it('lists the connectors alphabetically', () => {
    const body = renderRefreshPr(
      ['.zoom', '.1password', '.bigquery'].map((connector) =>
        changed(connector, [field('GET /a', 'x')])
      )
    );

    const order = [...body.matchAll(/^### `(\.[^`]+)`/gm)].map(([, connector]) => connector);
    expect(order).toEqual(['.1password', '.bigquery', '.zoom']);
  });

  it('puts every kind of change of an endpoint in its cell, on its own line', () => {
    const body = renderRefreshPr([
      changed('.other', [
        field('GET /a', 'title'),
        added('GET /a', 'response property `old` deprecated', 'response-property-deprecated'),
      ]),
    ]);

    expect(body).toContain('```diff\n! deprecated old\n+ response field title\n```');
  });

  it('names an endpoint no action is recorded on with a dash, and keeps unlocated changes last', () => {
    const body = renderRefreshPr([
      changed('.other', [field(undefined, 'servers'), field('GET /a', 'x')]),
    ]);

    const endpoints = body
      .split('<tr>\n<td>\n\n')
      .slice(1)
      .map((row) => row.split('\n')[0]);
    expect(endpoints).toEqual(['`GET /a`', '—']);
  });

  it('notes that the actions call other operations, or that the specs changed outside oasdiff', () => {
    const body = renderRefreshPr([
      { ...refreshable, connector: '.moved', sources: {}, operationsChanged: true },
      { ...refreshable, connector: '.quiet', sources: {} },
    ]);

    expect(body).toContain('### `.moved`\n\n- The actions call other operations.');
    expect(body).toContain('### `.quiet`\n\n- The specs changed outside what `oasdiff` reports.');
  });

  it('cuts the table of a connector after 20 endpoints and counts the rest', () => {
    const body = renderRefreshPr([
      changed(
        '.other',
        Array.from({ length: 23 }, (_, index) =>
          field(`GET /e${String(index).padStart(2, '0')}`, 'x')
        )
      ),
    ]);

    expect(body).toContain('`GET /e19`');
    expect(body).not.toContain('`GET /e20`');
    expect(body).toContain('…and 3 more endpoints; the drift report lists them.');
  });

  const wide = (connector: string) =>
    changed(
      connector,
      Array.from({ length: 20 }, (_, endpoint) =>
        field(`GET /${endpoint}`, `${'y'.repeat(53)}${endpoint}`)
      )
    );

  it('still fits a small connector after one too big to fit', () => {
    const body = renderRefreshPr([
      ...Array.from({ length: 40 }, (_, index) => wide(`.big${String(index).padStart(2, '0')}`)),
      changed('.small', [field('GET /a', 'x')]),
    ]);

    expect(body).toContain('### `.small`');
    expect(body).toMatch(/The changes of `\.big\d+`/);
  });

  it('stays under the limit GitHub puts on a description, naming the connectors left out', () => {
    const body = renderRefreshPr(
      Array.from({ length: 60 }, (_, index) => wide(`.connector${index}`))
    );

    expect(body.length).toBeLessThan(65_536);
    expect(body).toContain('### `.connector0`');
    expect(body).toMatch(/### \d+ more connectors\n\nThe changes of `\.connector\d+`/);
    expect(body).toContain("don't fit in a pull request description");
  });
});
