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

    expect(title).toBe('[Connectors][Validation] `.sentry`: 2 actions need attention');
    // oasdiff reports the moved path as removed
    expect(body).toContain(
      '| `GET /api/0/issues/{id}/` | Moved, same URL | `getIssue` | API path removed without deprecation (`api-path-removed-without-deprecation`) |'
    );
    expect(body).toContain('> [!NOTE]');
    expect(body).toContain(
      "**Sentry's spec moved `/api/0` from its paths into its server URL. The connector most likely still works.**"
    );
    expect(body).toContain(
      "`listRules` calls an endpoint no spec describes, so it isn't checked (see the table)."
    );
    expect(body).toContain(
      '| **Server URL** | `https://{region}.sentry.io` → `https://{region}.sentry.io/api/0` |'
    );
    expect(body).toContain(
      '[Committed snapshot](https://github.com/elastic/kibana/blob/main/src/specs/sentry/vendor_api/snapshots/v0.openapi.json)'
    );
    expect(body).toContain(
      '| `getIssue` | `GET /api/0/issues/{id}/` | ❌ Fails | ⚠️ Moved in the spec, same URL |'
    );
    expect(body).toContain(
      '| `listRules` | `GET /api/0/rules/` | ➖ Not checked | No spec describes the endpoint ([#296284](https://github.com/elastic/kibana/issues/296284), see below) |'
    );
    expect(body).toContain(
      '➖ **Not in the spec** (`listRules`): the manifest records why: _Legacy endpoint, absent from the spec; see https://github.com/elastic/kibana/issues/296284_'
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
    expect(body).toContain(
      '> **1 of 2 actions works with the latest spec. 1 action needs attention.**\n>\n> `search` fails against the latest vendor spec.\n>\n> Update the connector to ensure it will continue working.'
    );
    // A failing action isn't also described as passing with changes
    expect(body).not.toContain('`search` passes');
    expect(body.indexOf('| `search` |')).toBeLessThan(body.indexOf('| `getItem` |'));
    expect(body).toContain(
      '| `search` | `GET /items` | ❌ Fails | Against the latest spec: `GET /items` limit must be <= 50 |'
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

    expect(title).toBe('[Connectors][Validation] `.acme`: 1 action needs attention');
    expect(body).toContain(
      '> **1 of 2 actions works with the latest spec. 1 action needs attention.**\n>\n> `search` passes but calls a deprecated endpoint.\n>\n> Update the connector to ensure it will continue working.'
    );
    expect(body).toContain('| Operation | Change | Connector Actions | Details |');
    expect(body).toContain(
      '| `GET /items` | Deprecated | `search` | endpoint deprecated (`endpoint-deprecated`) |'
    );
    // The request change is verified by running the actions, so it isn't one to review
    expect(body).not.toContain('| Request changed |');
    expect(body.indexOf('### Changes to review')).toBeLessThan(body.indexOf('### Actions'));
    expect(body).toContain(
      '| `search` | `GET /items` | ✅ Passes | ⚠️ Deprecated (see changes to review) |'
    );
  });

  it('counts only the actions that need a look, though another action fails', () => {
    const { title, body } = renderDriftIssue(
      {
        ...drifted,
        sources: {
          main: {
            status: 'changed',
            changes: [
              ...(drifted.sources.main.changes ?? []),
              {
                kind: 'breaking',
                id: 'request-property-max-length-decreased',
                text: 'decreased the max length of `id`',
                operation: 'GET /items/{id}',
              },
              {
                kind: 'breaking',
                id: 'response-property-type-changed',
                text: 'changed the type of `title`',
                operation: 'GET /items/{id}',
              },
            ],
          },
        },
        actions: drifted.actions?.map((action) => ({ ...action, tracked: true })),
      },
      { owners: [] }
    );

    expect(title).toBe('[Connectors][Validation] `.acme`: 1 action needs attention');
    expect(body).toContain(
      '> **1 of 2 actions works with the latest spec. 1 action needs attention.**\n>\n> `search` fails against the latest vendor spec.\n>\n> Update the connector to ensure it will continue working.'
    );
    // `getItem` passes, which verifies the request change, and doesn't read `title`
    expect(body).not.toMatch(/^\| `GET \/items\/\{id\}` \| [^|]+ \| `getItem` \|/m);
    expect(body).toContain(
      "| ✅ Passes | Vendor request has changed, and Connector's requests still match it. Vendor response has changed, but Connector is not using changed fields. |"
    );
  });

  it('says when a passing action passes a changed response along whole', () => {
    const { body } = renderDriftIssue(
      {
        ...drifted,
        verdict: 'healthy',
        latestProblems: [],
        sources: {
          main: {
            status: 'changed',
            changes: [
              {
                kind: 'breaking',
                id: 'response-property-type-changed',
                text: 'changed the type of `title`',
                operation: 'GET /items/{id}',
              },
            ],
          },
        },
        actions: [
          {
            ...(drifted.actions?.[1] as NonNullable<ConnectorDrift['actions']>[number]),
            tracked: true,
            fieldUse: { 'main GET /items/{id}': { read: [], copied: [], returned: [''] } },
            fieldChanges: [],
          },
        ],
      },
      { owners: [] }
    );

    expect(body).toContain('| Action | Calls | Status | Details |');
    expect(body).toContain(
      '| `getItem` | `GET /items/{id}` | ✅ Passes | Vendor response has changed, and Connector is passing along the entire changed response. |'
    );
  });

  it('lists what the vendor added to the called operations, and whether it reaches consumers', () => {
    const { body } = renderDriftIssue(
      {
        ...drifted,
        sources: {
          main: {
            status: 'changed',
            changes: [
              ...(drifted.sources.main.changes ?? []),
              {
                kind: 'non-breaking',
                id: 'new-optional-request-parameter',
                text: 'added the new optional `query` request parameter `sort`',
                operation: 'GET /items',
              },
              {
                kind: 'non-breaking',
                id: 'response-optional-property-added',
                text: 'added the optional property `owner` to the response with the `200` status',
                operation: 'GET /items/{id}',
              },
            ],
          },
        },
        actions: drifted.actions?.map((action): NonNullable<ConnectorDrift['actions']>[number] =>
          action.action === 'getItem'
            ? {
                ...action,
                tracked: true,
                fieldUse: { 'main GET /items/{id}': { read: [], copied: [], returned: [''] } },
              }
            : { ...action, tracked: true, fieldUse: {} }
        ),
      },
      { owners: [] }
    );

    expect(body).toContain(
      [
        '### New in the vendor API',
        '',
        "What the vendor added to the operations the actions call. The connector doesn't need to change, but its consumers can only use what reaches them.",
        '',
        '| Operation | New | Connector Actions | Reaches consumers of Connector |',
        '|---|---|---|---|',
        '| `GET /items` | Query parameter `sort` | `search` | No, no action sends it |',
        '| `GET /items/{id}` | Response field `owner` | `getItem` | Yes, passed along as is |',
      ].join('\n')
    );
    expect(body).not.toContain('<summary>New in the vendor API');
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

    expect(title).toBe('[Connectors][Validation] `.acme`: 1 action needs attention');
    expect(body).toContain('`search` passes but reads fields that changed.');
    expect(body).toContain(
      '| `search` | `GET /items` | ✅ Passes | ⚠️ Vendor response has changed, including fields Connector reads: `items/state` (new values: locked) |'
    );
    expect(body).toContain(
      "| `listAll` | `GET /items` | ✅ Passes | Vendor request has changed, and Connector's requests still match it. |"
    );
    expect(body).toContain('| `search` | `GET /items` | `items/state` | new values: locked |');
  });

  it('names a path removed without deprecation as a removal', () => {
    const { body } = renderDriftIssue(
      {
        ...drifted,
        verdict: 'healthy',
        latestProblems: [],
        sources: {
          main: {
            status: 'changed',
            changes: [
              {
                kind: 'breaking',
                id: 'api-path-removed-without-deprecation',
                text: 'API path removed without deprecation',
                operation: 'GET /items',
              },
            ],
          },
        },
        actions: drifted.actions?.map((action) => ({ ...action, latestProblems: [] })),
      },
      { owners: [] }
    );

    expect(body).toContain('`search` passes but calls an endpoint removed from the current spec.');
    expect(body).toContain('| `GET /items` | Removed | `search` |');
    expect(body).toContain(
      '| `search` | `GET /items` | ✅ Passes | ⚠️ Removed (see changes to review) |'
    );
  });

  it('counts the actions calling endpoints no spec describes, in an issue opened for another reason', () => {
    const { title, body } = renderDriftIssue(
      {
        ...drifted,
        verdict: 'healthy',
        latestProblems: [],
        sources: { main: { status: 'unchanged' } },
        actions: [
          { ...(drifted.actions?.[1] as NonNullable<ConnectorDrift['actions']>[number]) },
          ...(moved.actions ?? []).filter(({ action }) => action === 'listRules'),
        ],
        staleCorrections: [{ index: 0, target: '$.servers' }],
      },
      { owners: [] }
    );

    expect(title).toBe('[Connectors][Validation] `.acme`: 1 action needs attention');
    expect(body).toContain(
      '> **1 of 2 actions works with the latest spec. 1 action needs attention.**'
    );
    expect(body).toContain(
      "> 1 spec correction in `overlay.yaml` no longer applies. `listRules` calls an endpoint no spec describes, so it isn't checked (see the table)."
    );
  });

  it('says when the actions pass but the check found problems outside them, as a table', () => {
    const invalid = (authType: string) =>
      `Auth type ${authType}: 1 schema(s) are invalid:\n  POST /items (response 200 application/json): $ref "#/components/schemas/Void" does not resolve to a schema`;
    const { title, body } = renderDriftIssue(
      {
        ...drifted,
        sources: { main: { status: 'unchanged' } },
        actions: drifted.actions?.map((action) => ({ ...action, latestProblems: [] })),
        otherProblems: {
          snapshot: [],
          latest: [
            `${invalid('bearer')}\n${invalid('oauth')}`,
            'GET /items (main) looks like it returns a collection, as it returns an array; declare its "pagination" in manifest.json, or "none" if it returns everything at once',
            'something the renderer does not recognise',
          ],
        },
      },
      { owners: [] }
    );

    expect(title).toBe('[Connectors][Validation] `.acme`: 3 problems need attention');
    expect(body).toContain('> **All 2 actions work with the latest spec.**');
    expect(body).toContain(
      `> The check found 3 problems outside the actions, which don't occur against the committed snapshot (see "Other problems").`
    );
    expect(body).toContain('| Problem | Operation | Details | How to fix |');
    expect(body).toContain(
      '| Invalid schema in the spec | `POST /items` | response 200 application/json: $ref "#/components/schemas/Void" does not resolve to a schema (auth types `bearer`, `oauth`) | Correct the spec in `overlay.yaml` |'
    );
    expect(body).toContain(
      '| Pagination not declared | `GET /items` (`main`) | returns a collection, as it returns an array | Declare its `pagination` in `manifest.json`, or `"none"` |'
    );
    expect(body).toContain('| Other | — | something the renderer does not recognise | — |');
  });

  it.each([
    [
      'POST https://api.example.com/scan/ breaks the spec: Request body at /tags/0: String is too long (64 > 30).',
      '`POST https://api.example.com/scan/` Request body at `/tags/0`: String is too long (`64` > `30`).',
    ],
    [
      'GET /items/string/ matches no operation of any source; correct the spec in overlay.yaml, or add it to "unmatched" in manifest.json with a reason',
      '`GET /items/string/` matches no operation of any source; correct the spec in `overlay.yaml`, or add it to `unmatched` in `manifest.json` with a reason',
    ],
    [
      "has scope 'read' but sent POST https://example.com/_query; if the operation only queries, add it to the action's \"queries\" in fixtures.json, otherwise correct the scope",
      "has scope `read` but sent `POST https://example.com/_query`; if the operation only queries, add it to the action's `queries` in `fixtures.json`, otherwise correct the scope",
    ],
  ])('quotes what a failure names in code spans: %s', (problem, quoted) => {
    const { body } = renderDriftIssue(
      {
        ...drifted,
        actions: drifted.actions?.map((action) =>
          action.action === 'search' ? { ...action, latestProblems: [problem] } : action
        ),
      },
      { owners: [] }
    );

    expect(body).toContain(
      `| \`search\` | \`GET /items\` | ❌ Fails | Against the latest spec: ${quoted} |`
    );
  });

  it('counts an unmatched action that fails against the latest spec as checked', () => {
    const { title, body } = renderDriftIssue(
      {
        ...drifted,
        actions: [
          ...(drifted.actions ?? []).filter(({ action }) => action === 'getItem'),
          {
            action: 'scan',
            operations: [],
            unmatched: [{ operation: 'POST /scan/', reason: 'The spec has no trailing slash' }],
            snapshotProblems: [],
            latestProblems: ['POST https://api.example.com/scan/ breaks the spec: tags too long'],
          },
          {
            action: 'quota',
            operations: [],
            unmatched: [{ operation: 'GET /quota/', reason: 'Not in the spec' }],
            snapshotProblems: [],
            latestProblems: [],
          },
        ],
      },
      { owners: [] }
    );

    expect(title).toBe('[Connectors][Validation] `.acme`: 2 actions need attention');
    expect(body).toContain(
      '> **1 of 3 actions works with the latest spec. 2 actions need attention.**'
    );
    expect(body).toContain(
      "> `scan` fails against the latest vendor spec. 1 other spec change needs review (see the table). `quota` calls an endpoint no spec describes, so it isn't checked (see the table)."
    );
    expect(body).toContain('| `scan` | `POST /scan/` | ❌ Fails | Against the latest spec:');
    expect(body).not.toContain('**Not in the spec** (`scan`)');
  });

  it('counts problems outside the actions as the table lists them, and says what to fix', () => {
    const { title, body } = renderDriftIssue(
      {
        ...drifted,
        sources: { main: { status: 'unchanged' } },
        actions: drifted.actions?.map((action) => ({ ...action, latestProblems: [] })),
        otherProblems: {
          snapshot: [],
          latest: [
            'Auth type bearer: 2 schema(s) are invalid:\n  POST /a (response 207 application/json): $ref "#/components/schemas/Void" does not resolve to a schema\n  POST /b (response 207 application/json): $ref "#/components/schemas/Void" does not resolve to a schema',
          ],
        },
      },
      { owners: [] }
    );

    expect(title).toBe('[Connectors][Validation] `.acme`: 2 problems need attention');
    expect(body).toContain('The check found 2 problems outside the actions');
    expect(body).toContain(
      '| **Result** | Vendor drift: every checked action passes, but the latest spec has problems the committed snapshot has not |'
    );
    expect(body).toContain("> The actions don't need to change; fix what the tables below list.");
    expect(body).not.toContain('Update the connector to ensure it will continue working.');
  });

  it("doesn't say actions pass when the latest spec didn't load", () => {
    const { title, body } = renderDriftIssue(
      {
        ...drifted,
        verdict: 'unknown',
        latestProblems: undefined,
        sources: { main: { status: 'unreachable', error: '404 Not Found' } },
        actions: drifted.actions?.map((action) => ({ ...action, latestProblems: undefined })),
      },
      { owners: [] }
    );

    expect(title).toBe('[Connectors][Validation] `.acme`: 2 actions need attention');
    expect(body).toContain(
      "| `getItem` | `GET /items/{id}` | ➖ Not checked | The latest spec didn't load; passes against the committed snapshot |"
    );
    expect(body).not.toContain('✅');
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

    expect(title).toBe('[Connectors][Validation] `.acme`: 2 actions need attention');
    expect(body).toContain('…and 10 more; run the check for all of them.');
    expect(body).toContain('- `extra`: unreachable: `404 Not Found`');
    expect(body).toContain('| **Vendor spec `extra`** | Latest (unreachable: `404 Not Found`)');
  });

  it('renders a report from before the per-action fields', () => {
    const { title, body } = renderDriftIssue(
      { ...healthy, verdict: 'vendor-drift', latestProblems: ['search: limit must be <= 50'] },
      { owners: ['elastic/response-ops'] }
    );

    expect(title).toBe('[Connectors][Validation] `.acme`: 0 actions need attention');
    expect(body).toContain('| Other | — | search: limit must be <= 50 | — |');
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
