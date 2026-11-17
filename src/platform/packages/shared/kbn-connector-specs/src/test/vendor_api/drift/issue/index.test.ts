/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorDrift } from '../detect_drift';
import type { DriftProblem } from '../../drift_problem';
import { drifted, healthy } from '../drift_fixtures';
import { renderDriftIssue } from '.';

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
  it('keeps a table cell whole when its text has a backslash before a pipe', () => {
    const [search] = drifted.actions ?? [];
    const { body } = renderDriftIssue(
      {
        ...drifted,
        actions: [
          {
            ...search,
            latestProblems: ['GET /items breaks the spec: name must match a\\|b\\\\|c'],
          },
        ],
      },
      { owners: [] }
    );
    const row = body.split('\n').find((line) => line.startsWith('| `search` |')) ?? '';
    // GitHub reads a backslash and the character after it as one, so only a pipe that doesn't
    // follow an odd number of backslashes ends a cell.
    const cells = row.slice(1, -1).match(/(?:\\.|[^|\\])+/g);

    expect(cells).toHaveLength(4);
    expect(cells?.[3]).toContain('a\\\\\\|b\\\\\\\\\\|c');
  });

  it('says that paths moved into the server URL, why the check fails and how to fix it', () => {
    const { title, body } = renderDriftIssue(moved, { owners: [] });

    expect(title).toBe('[Connectors][Validation] `.sentry`: 2 actions need attention');
    expect(body).not.toContain('### Changes to review');
    expect(body).toContain(
      "The check can't match the requests of 1 action to the latest spec, so it didn't check it, but every operation it calls is still in the latest spec, at the same full URL."
    );
    expect(body).not.toContain('❌');
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
      "| `getIssue` | `GET /api/0/issues/{id}/` | ➖ Not checked | ⚠️ Moved in the spec, same URL, so it isn't checked against the latest spec (see below) |"
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

  it("says why the issue is open when the actions pass, naming the change in the action's details", () => {
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
      '> **1 of 2 actions works with the latest spec. 1 action needs attention.**\n>\n> `search` passes but uses a deprecated endpoint or field.\n>\n> Update the connector to ensure it will continue working.'
    );
    // The action's details name the change; the request change is verified by running it
    expect(body).toContain('| `search` | `GET /items` | ✅ Passes | ⚠️ Endpoint deprecated |');
    expect(body).not.toContain('### Changes to review');
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

  it('names the changed GraphQL fields an action passes along, and groups additions by field', () => {
    const graphqlAction = (
      action: string,
      operation: string,
      passed: string[]
    ): NonNullable<ConnectorDrift['actions']>[number] => ({
      action,
      operations: [{ source: 'api', operation, latest: { status: 'present' } }],
      unmatched: [],
      snapshotProblems: [],
      latestProblems: [],
      tracked: true,
      fieldUse: { [`api ${operation}`]: { read: [], copied: [], returned: [''] } },
      fieldChanges: [],
      graphqlUse: {
        [`api ${operation}`]: { read: [], passed, types: [], sent: [], sentTypes: [] },
      },
    });
    const change = (
      operation: string,
      id: string,
      coordinate: string,
      text: string,
      kind: 'breaking' | 'non-breaking' = 'breaking'
    ) => ({ kind, id, coordinate, operation, text });
    const { body } = renderDriftIssue(
      {
        ...healthy,
        outcome: 'refresh',
        sources: {
          api: {
            status: 'changed',
            format: 'graphql',
            changes: ['QUERY items', 'MUTATION delete_item'].flatMap((operation) => [
              change(
                operation,
                'response-property-type-changed',
                'Group.title',
                'Field Group.title changed type from String! to Int!.'
              ),
              change(
                operation,
                'response-optional-property-added',
                'Item.priority',
                'added the optional property `Item.priority` to the response',
                'non-breaking'
              ),
            ]),
          },
        },
        actions: [
          graphqlAction('getItem', 'QUERY items', ['Group.title', 'Item.name']),
          graphqlAction('deleteItem', 'MUTATION delete_item', ['Item.id']),
        ],
      },
      { owners: [] }
    );

    expect(body).toContain(
      '| `getItem` | `QUERY items` | ✅ Passes | Vendor response has changed, and Connector is passing along changed fields: `Group.title`. |'
    );
    expect(body).toContain(
      '| `deleteItem` | `MUTATION delete_item` | ✅ Passes | Vendor response has changed, but Connector is not using changed fields. |'
    );
    expect(body).toContain(
      "| `QUERY items`<br>`MUTATION delete_item` | Response field `Item.priority` | `getItem`, `deleteItem` | No, no action's query selects it |"
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
    expect(body).toContain(
      '| `search` | `GET /items` | ✅ Passes | ⚠️ API path removed without deprecation |'
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
    // The same invalid schema under two auth types is one problem to fix, so it shares a row.
    const invalid = (authType: string): DriftProblem => ({
      kind: 'invalid-schema',
      authType,
      operation: 'POST /items',
      location: 'response 200 application/json',
      message: '$ref "#/components/schemas/Void" does not resolve to a schema',
    });
    const { title, body } = renderDriftIssue(
      {
        ...drifted,
        sources: { main: { status: 'unchanged' } },
        actions: drifted.actions?.map((action) => ({ ...action, latestProblems: [] })),
        otherProblems: {
          snapshot: [],
          latest: [
            invalid('bearer'),
            invalid('oauth'),
            {
              kind: 'undeclared-pagination',
              operation: 'GET /items',
              source: 'main',
              reason: 'it returns an array',
            },
            { kind: 'other', text: 'something the renderer does not recognise' },
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
      '> `scan` fails against the latest vendor spec. 1 other spec change needs review (see "Other problems"). `quota` calls an endpoint no spec describes, so it isn\'t checked (see the table).'
    );
    expect(body).toContain('| `scan` | `POST /scan/` | ❌ Fails | Against the latest spec:');
    expect(body).not.toContain('**Not in the spec** (`scan`)');
    // The spec change on an operation no action calls
    expect(body).toContain(
      '| Request changed | `GET /items` | decreased the max of `limit` to 50 (`request-parameter-max-decreased`) | Refresh the artifacts, unless the connector depends on it |'
    );
  });

  it('says when actions only fail on credentials, and to check the vendor before the connector', () => {
    const credentials =
      'GET https://api.example.com/items breaks the spec: Request has no credentials for the operation; expected Authorization: Bearer';
    const withAuthChange = (actions: ConnectorDrift['actions']): ConnectorDrift => ({
      ...drifted,
      sources: {
        main: {
          status: 'changed',
          changes: [
            {
              kind: 'breaking',
              id: 'api-security-removed',
              text: 'the endpoint scheme security `basicAuth` was removed from the API',
              operation: 'GET /items',
            },
          ],
        },
      },
      actions,
    });
    const advice =
      "Check the vendor's docs on authentication: if they still accept the connector's credentials, correct the spec in `overlay.yaml` rather than the connector.";

    const { body } = renderDriftIssue(
      withAuthChange(
        drifted.actions?.map((action) =>
          action.action === 'search' ? { ...action, latestProblems: [credentials] } : action
        )
      ),
      { owners: [] }
    );
    expect(body).toContain(
      `> \`search\` fails because the latest spec requires credentials it doesn't send.\n>\n> ${advice}`
    );
    expect(body).toContain(
      "| `search` | `GET /items` | ❌ Fails | The latest spec requires credentials the connector doesn't send: expected `Authorization: Bearer`. Spec change: the endpoint scheme security `basicAuth` was removed from the API. |"
    );
    expect(body).not.toContain('Update the connector to ensure it will continue working.');

    // With another failure, the advice follows the credentials sentence
    const { body: mixed } = renderDriftIssue(
      withAuthChange(
        drifted.actions?.map((action) => ({
          ...action,
          latestProblems:
            action.action === 'search'
              ? [credentials]
              : ['GET https://api.example.com/items/0 breaks the spec: limit must be <= 50'],
        }))
      ),
      { owners: [] }
    );
    expect(mixed).toContain(
      `> \`search\` fails because the latest spec requires credentials it doesn't send. ${advice} \`getItem\` fails against the latest vendor spec.`
    );
    expect(mixed).toContain('Update the connector to ensure it will continue working.');
  });

  it('counts problems outside the actions as the table lists them, and says what to fix', () => {
    const { title, body } = renderDriftIssue(
      {
        ...drifted,
        sources: { main: { status: 'unchanged' } },
        actions: drifted.actions?.map((action) => ({ ...action, latestProblems: [] })),
        otherProblems: {
          snapshot: [],
          latest: ['/a', '/b'].map((path) => ({
            kind: 'invalid-schema' as const,
            authType: 'bearer',
            operation: `POST ${path}`,
            location: 'response 207 application/json',
            message: '$ref "#/components/schemas/Void" does not resolve to a schema',
          })),
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
