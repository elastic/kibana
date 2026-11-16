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
      url: 'https://specs.example.com/openapi.json',
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
  latestProblems: ['search: GET /items breaks the spec: limit must be <= 50'],
  verdict: 'vendor-drift',
  outcome: 'issue',
  displayName: 'Acme',
  folder: 'src/specs/acme',
  checkedAt: '2026-11-16T06:00:00.000Z',
  actions: [
    {
      action: 'search',
      operations: [{ source: 'main', operation: 'GET /items', latest: { status: 'present' } }],
      unmatched: [],
      snapshotProblems: [],
      latestProblems: ['GET /items breaks the spec: limit must be <= 50'],
    },
    {
      action: 'getItem',
      operations: [{ source: 'main', operation: 'GET /items/{id}', latest: { status: 'present' } }],
      unmatched: [],
      snapshotProblems: [],
      latestProblems: [],
    },
  ],
  otherProblems: { snapshot: [], latest: [] },
  staleCorrections: [],
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
        title: '[Connector validation] .acme: 1 action fails the drift check',
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
    expect(issues[0].title).toBe('[Connector validation] .acme: 2 actions fail the drift check');
    expect(comments).toEqual([[7, expect.stringContaining('https://buildkite.com/build/1')]]);
  });

  it('updates the issue when only its title differs', async () => {
    const { tracker, issues } = createTracker([
      { ...issueOf(drifted, 7, 'open'), title: '[Connector validation] Vendor API drift in .acme' },
    ]);
    const { actions } = await surface([drifted], tracker);

    expect(actions[0].action).toBe('updated');
    expect(issues[0].title).toBe('[Connector validation] .acme: 1 action fails the drift check');
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
// of the servers hides from the check.
const moved: ConnectorDrift = {
  connector: '.sentry',
  displayName: 'Sentry',
  folder: 'src/specs/sentry',
  checkedAt: '2026-11-16T06:00:00.000Z',
  sources: {
    v0: {
      status: 'changed',
      url: 'https://example.com/sentry.json',
      servers: {
        snapshot: ['https://{region}.sentry.io'],
        latest: ['https://{region}.sentry.io/api/0'],
      },
      changes: [
        {
          kind: 'breaking',
          id: 'api-path-removed-without-deprecation',
          text: 'API path removed without deprecation',
          operation: 'GET /api/0/issues/{id}/',
        },
      ],
    },
  },
  operationsChanged: true,
  snapshotProblems: [],
  latestProblems: ['getIssue: GET /api/0/issues/string/ matches no operation of any source'],
  verdict: 'vendor-drift',
  overlayFindings: ['overlay.yaml action 1 matches nothing in any source'],
  outcome: 'issue',
  actions: [
    {
      action: 'getIssue',
      operations: [
        {
          source: 'v0',
          operation: 'GET /api/0/issues/{id}/',
          latest: { status: 'moved', path: '/issues/{id}/', serverPath: '/api/0' },
        },
      ],
      unmatched: [],
      snapshotProblems: [],
      latestProblems: [
        'GET /api/0/issues/string/ matches no operation of any source; correct the spec in overlay.yaml',
      ],
    },
    {
      action: 'listRules',
      operations: [],
      unmatched: [
        {
          operation: 'GET /api/0/rules/',
          reason:
            'Legacy endpoint, absent from the spec; see https://github.com/elastic/kibana/issues/296284',
        },
      ],
      snapshotProblems: [],
      latestProblems: [],
    },
  ],
  otherProblems: { snapshot: [], latest: [] },
  staleCorrections: [
    {
      index: 1,
      target: "$.paths['/api/0/issues/{id}/'].put.requestBody",
      latest: { status: 'moved', path: '/issues/{id}/', serverPath: '/api/0' },
    },
  ],
  serversCorrection: 0,
};

describe('renderDriftIssue', () => {
  it('says that paths moved into the server URL, why the check fails and how to fix it', () => {
    const { title, body } = renderDriftIssue(moved, { owners: [] });

    expect(title).toBe(
      '[Connector validation] .sentry: spec paths moved into the server URL, 1 action fails the drift check'
    );
    expect(body).toContain('> [!NOTE]');
    expect(body).toContain(
      "**Sentry's spec moved `/api/0` from its paths into its server URL. The connector most likely still works.**"
    );
    expect(body).toContain(
      "1 action calls an endpoint missing from the current spec, so it isn't checked (see the table)."
    );
    expect(body).toContain(
      '| **Server URL** | `https://{region}.sentry.io` → `https://{region}.sentry.io/api/0` |'
    );
    expect(body).toContain(
      '[Committed snapshot](https://github.com/elastic/kibana/blob/main/src/specs/sentry/vendor_api/snapshots/v0.openapi.json)'
    );
    expect(body).toContain(
      '| `getIssue` | `GET /api/0/issues/{id}/` | ⚠️ Moved in the spec, same URL |'
    );
    expect(body).toContain(
      '| `listRules` | `GET /api/0/rules/` | ⚠️ Endpoint is missing from current spec ([#296284](https://github.com/elastic/kibana/issues/296284), see below) |'
    );
    expect(body).toContain(
      '⚠️ **Endpoint is missing from current spec** (`listRules`): the manifest records why: _Legacy endpoint, absent from the spec; see https://github.com/elastic/kibana/issues/296284_'
    );
    expect(body).toContain('### Why the check fails');
    expect(body).toContain('Correction 1 in [`overlay.yaml`]');
    expect(body).toContain(
      '| 2 | `PUT /api/0/issues/{id}/`: `requestBody` | Moved to `/issues/{id}/` |'
    );
    expect(body).toContain(
      '1. In `overlay.yaml`, keep the `/api/0` base path when correction 1 changes the servers, and point correction 2 at the moved paths.'
    );
    // Moves stand in for the generated request paths, which say nothing to a reader
    expect(body).not.toContain('string/');
    expect(body).not.toContain('cc ');
  });

  it('lists failing actions first, quoting their problem, and the changes to the spec', () => {
    const { body } = renderDriftIssue(drifted, { owners: [] });

    expect(body).toContain('> [!WARNING]');
    expect(body).toContain('**1 of 2 checked actions of `.acme` fail against the latest spec.**');
    expect(body.indexOf('| `search` |')).toBeLessThan(body.indexOf('| `getItem` |'));
    expect(body).toContain(
      '| `search` | `GET /items` | ❌ Fails against the latest spec: GET /items breaks the spec: limit must be <= 50 |'
    );
    expect(body).toContain('| `getItem` | `GET /items/{id}` | ✅ Passes |');
    expect(body).toContain('<details><summary>2 spec changes</summary>');
    expect(body).toContain(
      '| breaking | `GET /items` | decreased the max of `limit` to 50 | `request-parameter-max-decreased` |'
    );
    expect(body).toContain(
      '| non-breaking | — | added `title` | `response-optional-property-added` |'
    );
    expect(body).toContain('node scripts/connector_vendor_api --drift --connector acme');
    expect(body).toContain('`/update-connector acme <link to this issue>`');
  });

  it('says why the issue is open when the actions pass, and lists the changes to review first', () => {
    const passing: ConnectorDrift = {
      ...drifted,
      verdict: 'healthy',
      latestProblems: [],
      sources: {
        main: {
          status: 'changed',
          changes: [
            {
              kind: 'deprecation',
              id: 'endpoint-deprecated',
              text: 'endpoint deprecated',
              operation: 'GET /items',
            },
            {
              kind: 'breaking',
              id: 'request-parameter-max-decreased',
              text: 'decreased the max of `limit` to 50',
              operation: 'GET /items',
            },
          ],
        },
      },
      actions: drifted.actions?.map((action) => ({
        ...action,
        latestProblems: [],
        tracked: true,
        fieldUse: {},
        fieldChanges: [],
      })),
    };
    const { title, body } = renderDriftIssue(passing, { owners: [] });

    expect(title).toBe('[Connector validation] .acme: actions pass, 1 spec change to review');
    expect(body).toContain(
      "This issue is open for 1 deprecation (`search`), which running the actions can't settle. Review it before refreshing the artifacts."
    );
    expect(body).toContain(
      '| Deprecated | `GET /items` | `search` | endpoint deprecated (`endpoint-deprecated`) |'
    );
    // The request change is verified by running the actions, so it isn't one to review
    expect(body).not.toContain('| Request changed |');
    expect(body.indexOf('### Changes to review')).toBeLessThan(body.indexOf('### Actions'));
    expect(body).toContain(
      '| `search` | `GET /items` | ✅ Passes · deprecated (see changes to review) |'
    );
  });

  it('lists the changed fields that passing actions read, and those that read none', () => {
    const passing: ConnectorDrift = {
      ...drifted,
      verdict: 'healthy',
      latestProblems: [],
      actions: [
        {
          ...(drifted.actions?.[0] as NonNullable<ConnectorDrift['actions']>[number]),
          latestProblems: [],
          tracked: true,
          fieldUse: { 'main GET /items': { read: ['items/state'], copied: [], returned: [] } },
          fieldChanges: [
            { operation: 'GET /items', field: 'items/state', changes: ['new values: locked'] },
          ],
        },
        {
          action: 'listAll',
          operations: [{ source: 'main', operation: 'GET /items', latest: { status: 'present' } }],
          unmatched: [],
          snapshotProblems: [],
          latestProblems: [],
          tracked: true,
          fieldUse: { 'main GET /items': { read: [], copied: [], returned: [''] } },
          fieldChanges: [],
        },
      ],
    };
    const { title, body } = renderDriftIssue(passing, { owners: [] });

    expect(title).toBe('[Connector validation] .acme: actions pass, 1 field they read changed');
    expect(body).toContain(
      "**The connector still works against the latest spec: all 2 checked actions of `.acme` pass.** This issue is open for 1 changed field the actions read, which running the actions can't settle. Review it before refreshing the artifacts."
    );
    expect(body).toContain(
      '| `search` | `GET /items` | ⚠️ Passes, but fields it reads changed: `items/state` (new values: locked) |'
    );
    expect(body).toContain(
      '| `listAll` | `GET /items` | ✅ Passes · fields it reads unchanged; returns response fields as they are |'
    );
    expect(body).toContain('| `search` | `GET /items` | `items/state` | new values: locked |');
  });

  it('says when the actions pass but the check found problems outside them', () => {
    const { title, body } = renderDriftIssue(
      {
        ...drifted,
        actions: drifted.actions?.map((action) => ({ ...action, latestProblems: [] })),
        otherProblems: {
          snapshot: [],
          latest: [
            'Auth type bearer: 1 schema(s) are invalid:\n  POST /items: $ref does not resolve',
          ],
        },
      },
      { owners: [] }
    );

    expect(title).toBe(
      '[Connector validation] .acme: the latest spec fails the drift check (1 problem outside the actions)'
    );
    expect(body).toContain(
      '**Every checked action of `.acme` passes against the latest spec, but the check found 1 problem outside the actions**'
    );
    expect(body).toContain(
      '- Auth type bearer: 1 schema(s) are invalid:\n    POST /items: $ref does not resolve'
    );
  });

  it('reports unreachable sources and caps long change lists', () => {
    const many = Array.from({ length: 70 }, (_, index) => ({
      kind: 'breaking' as const,
      id: 'api-removed',
      text: `removed ${index}`,
    }));
    const { title, body } = renderDriftIssue(
      {
        ...drifted,
        verdict: 'unknown',
        sources: {
          main: { status: 'changed', changes: many },
          extra: { status: 'unreachable', error: '404 Not Found' },
        },
      },
      { owners: [] }
    );

    expect(title).toBe("[Connector validation] .acme: a latest vendor spec couldn't be loaded");
    expect(body).toContain('…and 10 more; run the check for all of them.');
    expect(body).toContain('- `extra`: unreachable: `404 Not Found`');
    expect(body).toContain('| **Vendor spec `extra`** | Latest (unreachable: `404 Not Found`)');
  });

  it('renders a report from before the per-action fields', () => {
    const { title, body } = renderDriftIssue(
      { ...healthy, verdict: 'vendor-drift', latestProblems: ['search: limit must be <= 50'] },
      { owners: ['elastic/response-ops'] }
    );

    expect(title).toBe('[Connector validation] .acme: vendor drift');
    expect(body).toContain('- search: limit must be <= 50');
    expect(body).toContain('cc @elastic/response-ops');
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
