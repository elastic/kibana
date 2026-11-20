/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../../connector_spec';
import type { ActionDrift, ConnectorDrift, DetectDriftOptions, SpecChange } from './detect_drift';
import { classifyChange, detectDrift, reviewOfChange } from './detect_drift';
import type { OasdiffEntry } from './run_oasdiff';
import { renderDriftIssue } from './issue';
import { updateVendorApi } from '../record/update_vendor_api';

const BASE = 'https://api.example.com';
const SPEC_URL = 'https://specs.example.com/openapi.yaml';

const specYaml = ({
  version = '1.0',
  itemsPath = '/items',
  itemProperties = '{ name: { type: string } }',
} = {}) => `
openapi: 3.0.3
info: { title: Example, version: '${version}' }
servers: [{ url: '${BASE}' }]
paths:
  ${itemsPath}:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties: ${itemProperties}
`;

const connector: ConnectorSpec = {
  metadata: {
    id: '.example',
    displayName: 'Example',
    description: 'Example',
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  auth: { types: ['none'] },
  test: { enabled: false, handler: async () => ({}) },
  actions: {
    getItems: {
      scope: 'read',
      input: z.object({}),
      handler: async ({ client }) => (await client.get(`${BASE}/items`)).data,
    },
  },
};

const entry = (id: string, level: number): OasdiffEntry => ({
  id,
  level,
  text: id,
  operation: 'GET',
  path: '/items',
});

describe('detectDrift', () => {
  let directory: string;
  let documents: Record<string, string>;
  let diffEntries: OasdiffEntry[] | undefined;
  const diff = jest.fn(async () => diffEntries);

  const detect = (options: Partial<DetectDriftOptions> = {}) =>
    detectDrift({
      connector,
      directory,
      fetchText: async (url) => {
        if (!(url in documents)) {
          throw new Error('404 Not Found');
        }
        return documents[url];
      },
      now: () => new Date('2026-10-23T12:00:00.000Z'),
      log: { info: () => {}, warning: () => {} },
      diff,
      ...options,
    });

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vendor-api-drift-'));
    documents = { [SPEC_URL]: specYaml() };
    diffEntries = [];
    diff.mockClear();
    await updateVendorApi({
      connector,
      directory,
      sources: { main: SPEC_URL },
      fetchText: async (url) => documents[url],
      now: () => new Date('2026-10-07T12:00:00.000Z'),
      log: { info: () => {}, warning: () => {} },
    });
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('reports nothing to do while the spec is unchanged', async () => {
    expect(await detect({ folder: 'src/specs/example' })).toEqual({
      connector: '.example',
      sources: {
        main: {
          status: 'unchanged',
          url: SPEC_URL,
          servers: { snapshot: [BASE], latest: [BASE] },
        },
      },
      operationsChanged: false,
      snapshotProblems: [],
      latestProblems: [],
      verdict: 'healthy',
      overlayFindings: [],
      outcome: 'none',
      displayName: 'Example',
      folder: 'src/specs/example',
      checkedAt: '2026-10-23T12:00:00.000Z',
      actions: [
        {
          action: 'getItems',
          operations: [{ source: 'main', operation: 'GET /items', latest: { status: 'present' } }],
          unmatched: [],
          snapshotProblems: [],
          latestProblems: [],
          fieldUse: { 'main GET /items': { read: [], copied: [], returned: [''] } },
          tracked: true,
          fieldChanges: [],
        },
      ],
      otherProblems: { snapshot: [], latest: [] },
      staleCorrections: [],
    });
    expect(diff).not.toHaveBeenCalled();
  });

  it('ignores a new info.version, which vendors change on every deploy', async () => {
    documents[SPEC_URL] = specYaml({ version: '1.1' });

    expect((await detect()).outcome).toBe('none');
  });

  it('proposes a refresh for non-breaking changes the actions still pass', async () => {
    documents[SPEC_URL] = specYaml({
      itemProperties: '{ name: { type: string }, color: { type: string } }',
    });
    diffEntries = [entry('response-optional-property-added', 1)];

    expect(await detect()).toMatchObject({
      sources: {
        main: {
          status: 'changed',
          changes: [
            {
              kind: 'non-breaking',
              id: 'response-optional-property-added',
              text: 'response-optional-property-added',
              operation: 'GET /items',
            },
          ],
        },
      },
      verdict: 'healthy',
      outcome: 'refresh',
    });
  });

  it('reports vendor drift when an action fails against the latest spec only', async () => {
    documents[SPEC_URL] = specYaml({ itemsPath: '/v2/items' });
    diffEntries = [entry('api-path-removed-without-deprecation', 3)];

    const drift = await detect();

    expect(drift.snapshotProblems).toEqual([]);
    expect(drift.latestProblems).toEqual([
      expect.stringContaining('getItems: GET /items matches no operation of any source'),
    ]);
    expect(drift.sources.main.changes).toEqual([
      expect.objectContaining({ kind: 'breaking', id: 'api-path-removed-without-deprecation' }),
    ]);
    expect(drift.operationsChanged).toBe(true);
    expect(drift).toEqual(expect.objectContaining({ verdict: 'vendor-drift', outcome: 'issue' }));
    expect(drift.actions).toMatchObject([
      {
        action: 'getItems',
        operations: [{ source: 'main', operation: 'GET /items', latest: { status: 'missing' } }],
        unmatched: [],
        snapshotProblems: [],
        latestProblems: [expect.stringMatching(/^GET \/items matches no operation of any source/)],
      },
    ]);
  });

  it('finds operations whose path prefix moved into the server URL, and the correction that hides it', async () => {
    const versioned: ConnectorSpec = {
      ...connector,
      actions: {
        getItems: {
          scope: 'read',
          input: z.object({}),
          handler: async ({ client }) => (await client.get(`${BASE}/v1/items`)).data,
        },
      },
    };
    const versionedDirectory = path.join(directory, 'versioned');
    await fs.mkdir(versionedDirectory);
    documents[SPEC_URL] = specYaml({ itemsPath: '/v1/items' });
    await updateVendorApi({
      connector: versioned,
      directory: versionedDirectory,
      sources: { main: SPEC_URL },
      fetchText: async (url) => documents[url],
      now: () => new Date('2026-10-07T12:00:00.000Z'),
      log: { info: () => {}, warning: () => {} },
    });
    // Corrections like Sentry's: match any host, and fix the operation
    await fs.writeFile(
      path.join(versionedDirectory, 'overlay.yaml'),
      `overlay: 1.0.0
info: { title: Corrections, version: '1' }
actions:
  - target: $.servers
    description: Self-hosted instances serve the API too
    remove: true
  - target: "$.paths['/v1/items'].get"
    description: The vendor documents no error responses
    update: { responses: { '404': { description: Not found } } }
`
    );
    documents[SPEC_URL] = specYaml({ itemsPath: '/items' }).replace(
      `servers: [{ url: '${BASE}' }]`,
      `servers: [{ url: '${BASE}/v1' }]`
    );

    const drift = await detect({ connector: versioned, directory: versionedDirectory });

    expect(drift.verdict).toBe('vendor-drift');
    expect(drift.actions?.[0].operations).toEqual([
      {
        source: 'main',
        operation: 'GET /v1/items',
        latest: { status: 'moved', path: '/items', serverPath: '/v1' },
      },
    ]);
    expect(drift.sources.main.servers).toEqual({ snapshot: [BASE], latest: [`${BASE}/v1`] });
    expect(drift.serversCorrection).toBe(0);
    expect(drift.staleCorrections).toEqual([
      {
        index: 1,
        target: "$.paths['/v1/items'].get",
        latest: { status: 'moved', path: '/items', serverPath: '/v1' },
      },
    ]);
  });

  it('opens an issue when a response field an action reads changed', async () => {
    const reader: ConnectorSpec = {
      ...connector,
      actions: {
        getName: {
          scope: 'read',
          input: z.object({}),
          handler: async ({ client }) => {
            const { data } = await client.get(`${BASE}/items`);
            return { name: data.name };
          },
        },
      },
    };
    const readerDirectory = path.join(directory, 'reader');
    await fs.mkdir(readerDirectory);
    await updateVendorApi({
      connector: reader,
      directory: readerDirectory,
      sources: { main: SPEC_URL },
      fetchText: async (url) => documents[url],
      now: () => new Date('2026-10-07T12:00:00.000Z'),
      log: { info: () => {}, warning: () => {} },
    });
    documents[SPEC_URL] = specYaml({ itemProperties: '{ name: { type: integer } }' });
    diffEntries = [entry('response-property-type-changed', 3)];

    const drift = await detect({ connector: reader, directory: readerDirectory });

    expect(drift.verdict).toBe('healthy');
    expect(drift.actions?.[0]).toMatchObject({
      fieldUse: { 'main GET /items': { read: ['name'] } },
      tracked: true,
      fieldChanges: [{ operation: 'GET /items', field: 'name', changes: ['type string → number'] }],
    });
    expect(drift.outcome).toBe('issue');
  });

  it('keeps what the actions send in their field use', async () => {
    const sender: ConnectorSpec = {
      ...connector,
      actions: {
        getItems: {
          scope: 'read',
          input: z.object({}),
          handler: async ({ client }) =>
            (await client.get(`${BASE}/items`, { params: { limit: 5 } })).data,
        },
      },
    };
    documents[SPEC_URL] = specYaml().replace(
      '    get:\n',
      '    get:\n      parameters: [{ name: limit, in: query, schema: { type: integer } }]\n'
    );
    const senderDirectory = path.join(directory, 'sender');
    await fs.mkdir(senderDirectory);
    await updateVendorApi({
      connector: sender,
      directory: senderDirectory,
      sources: { main: SPEC_URL },
      fetchText: async (url) => documents[url],
      now: () => new Date('2026-10-07T12:00:00.000Z'),
      log: { info: () => {}, warning: () => {} },
    });

    const drift = await detect({ connector: sender, directory: senderDirectory });

    expect(drift.actions?.[0].fieldUse?.['main GET /items']).toMatchObject({ sent: ['?limit'] });
  });

  it('compares GraphQL schemas by the fields the actions use', async () => {
    const GRAPHQL = 'https://api.example.com/graphql';
    const SCHEMA_URL = 'https://api.example.com/schema.graphql';
    const schema = (item: string) =>
      `type Query { items: [Item!]! }\ntype Item { id: ID!, ${item} }`;
    const lister: ConnectorSpec = {
      ...connector,
      actions: {
        listNames: {
          scope: 'read',
          input: z.object({}),
          handler: async ({ client }) => {
            const { data } = await client.post(GRAPHQL, { query: '{ items { name } }' });
            return data.data.items.map(({ name }: { name: string }) => name);
          },
        },
      },
    };
    const graphqlDirectory = path.join(directory, 'graphql');
    await fs.mkdir(graphqlDirectory);
    documents[SCHEMA_URL] = schema('name: String!, size: Int');
    await updateVendorApi({
      connector: lister,
      directory: graphqlDirectory,
      sources: { api: SCHEMA_URL },
      formats: { api: 'graphql' },
      endpoints: { api: [GRAPHQL] },
      fetchText: async (url) => documents[url],
      now: () => new Date('2026-10-07T12:00:00.000Z'),
      log: { info: () => {}, warning: () => {} },
    });
    documents[SCHEMA_URL] = schema('name: String! @deprecated(reason: "use title"), title: String');

    const drift = await detect({
      connector: lister,
      directory: graphqlDirectory,
      folder: 'src/specs/example',
    });

    expect(diff).not.toHaveBeenCalled();
    expect(drift).toMatchObject({ verdict: 'healthy', outcome: 'issue' });
    expect(drift.sources.api).toMatchObject({ status: 'changed' });
    expect(
      drift.sources.api.changes?.map(({ kind, id, coordinate }) => `${kind} ${id} ${coordinate}`)
    ).toEqual([
      'breaking response-property-removed Item.size',
      'non-breaking response-optional-property-added Item.title',
      'deprecation response-property-deprecated Item.name',
    ]);
    expect(drift.actions?.[0]).toMatchObject({
      operations: [{ source: 'api', operation: 'QUERY items', latest: { status: 'present' } }],
      latestProblems: [],
      fieldChanges: [{ operation: 'QUERY items', field: 'items/name', changes: ['deprecated'] }],
      graphqlUse: { 'api QUERY items': { read: ['Item.name'] } },
    });

    const { title, body } = renderDriftIssue(drift, { owners: [] });
    expect(title).toBe('[Connectors][Validation] `.example`: 1 action needs attention');
    expect(body).toContain(
      '| `listNames` | `QUERY items` | ✅ Passes | ⚠️ Vendor response has changed, including fields Connector reads: `items/name` (deprecated) |'
    );
    expect(body).toContain('vendor_api/snapshots/api.graphql');
    expect(body).toContain(
      "| `QUERY items` | Response field `Item.title` | `listNames` | No, no action's query selects it |"
    );
  });

  it('proposes a refresh for a breaking response change to fields no action reads', async () => {
    documents[SPEC_URL] = specYaml({ itemProperties: '{ name: { type: integer } }' });
    diffEntries = [entry('response-property-type-changed', 3)];

    const drift = await detect();

    expect(drift.actions?.[0]).toMatchObject({
      fieldUse: { 'main GET /items': { read: [], returned: [''] } },
      tracked: true,
      fieldChanges: [],
    });
    expect(drift).toMatchObject({ verdict: 'healthy', outcome: 'refresh' });
  });

  it.each([
    'response-header-removed',
    'response-success-status-removed',
    'response-media-type-removed',
  ])('opens an issue for a breaking %s, which field use does not observe', async (id) => {
    documents[SPEC_URL] = specYaml({
      itemProperties: '{ name: { type: string }, color: { type: string } }',
    });
    diffEntries = [entry(id, 3)];

    const drift = await detect();

    expect(drift.actions?.[0]).toMatchObject({ tracked: true });
    expect(drift).toMatchObject({ verdict: 'healthy', outcome: 'issue' });
  });

  it('proposes a refresh for a removed auth requirement the passing actions verify', async () => {
    documents[SPEC_URL] = specYaml({
      itemProperties: '{ name: { type: string }, color: { type: string } }',
    });
    diffEntries = [entry('api-security-removed', 1)];

    const drift = await detect();

    expect(drift.sources.main.changes).toEqual([
      expect.objectContaining({ kind: 'breaking', id: 'api-security-removed' }),
    ]);
    expect(drift).toMatchObject({ verdict: 'healthy', outcome: 'refresh' });
  });

  it('leaves out removals of what the latest spec still has, which only the snapshot lacks', async () => {
    documents[SPEC_URL] = `${specYaml({
      itemProperties: '{ name: { type: string }, color: { type: string } }',
    })}
  /other:
    get:
      responses: { '204': { description: none } }
components:
  schemas:
    Shared: { type: string }
  securitySchemes:
    token: { type: http, scheme: bearer }
`;
    const removed = (id: string, text: string, level = 1): OasdiffEntry => ({ id, text, level });
    diffEntries = [
      { ...entry('api-path-removed-without-deprecation', 3), path: '/other' },
      { ...entry('api-path-removed-without-deprecation', 3), path: '/gone' },
      removed('api-schema-removed', 'removed the schema `Shared`'),
      removed('api-schema-removed', 'removed the schema `Gone`'),
      removed(
        'api-security-component-removed',
        'the component security scheme `token` was removed'
      ),
    ];

    const { sources } = await detect();

    expect(sources.main.changes?.map(({ operation, text }) => operation ?? text)).toEqual([
      'GET /gone',
      'removed the schema `Gone`',
    ]);
  });

  it('opens an issue for deprecations, though the actions still pass', async () => {
    documents[SPEC_URL] = specYaml({
      itemProperties: '{ name: { type: string }, color: { type: string } }',
    });
    diffEntries = [entry('endpoint-deprecated', 1)];

    expect(await detect()).toEqual(
      expect.objectContaining({ verdict: 'healthy', outcome: 'issue' })
    );
  });

  it('opens an issue when the latest spec does not load', async () => {
    delete documents[SPEC_URL];

    expect(await detect()).toMatchObject({
      sources: {
        main: { status: 'unreachable', error: expect.stringContaining('404'), url: SPEC_URL },
      },
      verdict: 'unknown',
      outcome: 'issue',
    });
  });

  it('loads a Markdown reference by its format and pages', async () => {
    const llmsUrl = 'https://docs.example.com/llms.txt';
    documents[llmsUrl] = '# Example API\n- [Items](api-reference/items.md)';
    documents['https://docs.example.com/api-reference/items.md'] = [
      '# Items',
      '',
      '`GET` `/items`',
      '',
      `**Base URL:** \`${BASE}\``,
      '',
      '## Responses',
      '',
      '### 200',
      'Successful Response',
      '',
      '| Field | Type | Description |',
      '|-------|------|-------------|',
      '| `name` | string |  |',
    ].join('\n');
    const markdownDirectory = path.join(directory, 'markdown');
    await fs.mkdir(markdownDirectory);
    await updateVendorApi({
      connector,
      directory: markdownDirectory,
      sources: { main: llmsUrl },
      formats: { main: 'brave-markdown' },
      pages: { main: ['api-reference/'] },
      fetchText: async (url) => documents[url],
      now: () => new Date('2026-10-07T12:00:00.000Z'),
      log: { info: () => {}, warning: () => {} },
    });

    expect(await detect({ directory: markdownDirectory })).toMatchObject({
      sources: { main: { status: 'unchanged' } },
      verdict: 'healthy',
      outcome: 'none',
    });
  });

  it('reports a Kibana-side regression when actions fail against the snapshots', async () => {
    const legacy: ConnectorSpec = {
      ...connector,
      actions: {
        ...connector.actions,
        legacy: {
          scope: 'read',
          input: z.object({}),
          handler: async ({ client }) => (await client.get(`${BASE}/legacy`)).data,
        },
      },
    };

    const drift = await detect({ connector: legacy });

    expect(drift.snapshotProblems).toEqual([
      expect.stringContaining('legacy: GET /legacy matches no operation of any source'),
    ]);
    expect(drift).toEqual(
      expect.objectContaining({ verdict: 'kibana-regression', outcome: 'issue' })
    );
  });

  it('opens an issue for changes it cannot classify without oasdiff', async () => {
    documents[SPEC_URL] = specYaml({
      itemProperties: '{ name: { type: string }, color: { type: string } }',
    });
    diffEntries = undefined;

    expect(await detect()).toMatchObject({
      sources: { main: { status: 'changed' } },
      outcome: 'issue',
    });
  });

  it('reports overlay actions that no longer match the latest spec', async () => {
    await fs.writeFile(
      path.join(directory, 'overlay.yaml'),
      `overlay: 1.0.0
info: { title: Corrections, version: '1' }
actions:
  - target: "$.paths['/items'].get"
    description: The vendor documents no error responses
    update: { responses: { '404': { description: Not found } } }
`
    );
    documents[SPEC_URL] = specYaml({ itemsPath: '/v2/items' });

    expect((await detect()).overlayFindings).toEqual([
      expect.stringContaining('overlay.yaml action 0 matches nothing in any source'),
    ]);
  });

  it('writes nothing to the vendor_api folder', async () => {
    const read = async () =>
      Promise.all(
        ['manifest.json', 'snapshots/main.openapi.json'].map((file) =>
          fs.readFile(path.join(directory, file), 'utf8')
        )
      );
    const before = await read();
    documents[SPEC_URL] = specYaml({ itemsPath: '/v2/items' });

    await detect();

    expect(await read()).toEqual(before);
  });
});

describe('classifyChange', () => {
  it.each([
    ['response-optional-property-added', 1, 'non-breaking'],
    ['response-property-enum-value-added', 3, 'breaking'],
    ['request-parameter-max-decreased', 3, 'breaking'],
    ['response-body-wrapped-in-one-of-original-preserved', 2, 'breaking'],
    ['endpoint-deprecated', 1, 'deprecation'],
    ['request-parameter-deprecated-sunset-missing', 3, 'deprecation'],
    ['api-removed-with-deprecation', 1, 'breaking'],
    ['api-path-removed-before-sunset', 3, 'breaking'],
  ])('classifies %s (level %i) as %s', (id, level, kind) => {
    expect(classifyChange(entry(id, level))).toBe(kind);
  });
});

describe('reviewOfChange', () => {
  const action = (name: string, operation: string, overrides: Partial<ActionDrift> = {}) => ({
    action: name,
    operations: [{ source: 'main', operation, latest: { status: 'present' as const } }],
    unmatched: [],
    snapshotProblems: [],
    latestProblems: [],
    tracked: true,
    ...overrides,
  });
  // `scrape` fails against the latest spec; the others pass.
  const drift: Omit<ConnectorDrift, 'outcome'> = {
    connector: '.acme',
    sources: { main: { status: 'changed' } },
    operationsChanged: false,
    snapshotProblems: [],
    latestProblems: ['scrape: POST /scrape breaks the spec'],
    verdict: 'vendor-drift',
    overlayFindings: [],
    actions: [
      action('scrape', 'POST /scrape', { latestProblems: ['POST /scrape breaks the spec'] }),
      action('crawl', 'POST /crawl'),
      action('search', 'POST /search', { tracked: false }),
    ],
  };
  const change = (id: string, operation?: string): SpecChange => ({
    kind: classifyChange(entry(id, id.includes('deprecated') ? 1 : 3)),
    id,
    text: id,
    ...(operation ? { operation } : {}),
  });
  const review = reviewOfChange(drift);

  it('leaves out callers whose passing verifies a request change, though another action fails', () => {
    expect(review('main', change('request-parameter-max-decreased', 'POST /crawl'))).toEqual({
      needsReview: false,
      actions: [],
    });
    expect(review('main', change('request-parameter-max-decreased', 'POST /scrape'))).toEqual({
      needsReview: true,
      actions: ['scrape'],
    });
  });

  it('reviews a changed GraphQL default for the callers that leave the argument out', () => {
    const graphqlAction = (name: string, sent: string[]) =>
      action(name, 'QUERY items', {
        graphqlUse: {
          'main QUERY items': {
            read: [],
            passed: [],
            types: [],
            selectedFields: [],
            sent,
            sentTypes: [],
          },
        },
      });
    const healthy: Omit<ConnectorDrift, 'outcome'> = {
      ...drift,
      verdict: 'healthy',
      latestProblems: [],
      actions: [
        graphqlAction('leavesOut', []),
        graphqlAction('sends', ['Query.items(limit:)']),
        action('untracked', 'QUERY items', { tracked: false }),
      ],
    };
    const defaultChange: SpecChange = {
      kind: 'breaking',
      id: 'request-parameter-default-value-changed',
      text: 'Query.items(limit:) has changed defaultValue from 100 to 1.',
      operation: 'QUERY items',
      coordinate: 'Query.items(limit:)',
    };

    // A mock accepts either default, so passing proves nothing; one that sends the argument is
    // not affected
    expect(reviewOfChange(healthy)('main', defaultChange)).toEqual({
      needsReview: true,
      actions: ['leavesOut', 'untracked'],
    });
  });

  it('verifies response changes by field use only for the callers it was tracked for', () => {
    expect(review('main', change('response-property-type-changed', 'POST /crawl'))).toEqual({
      needsReview: false,
      actions: [],
    });
    expect(review('main', change('response-property-type-changed', 'POST /search'))).toEqual({
      needsReview: true,
      actions: ['search'],
    });
  });

  it('reviews a deprecated property only for the tracked callers that use it', () => {
    const deprecated = (id: string, property: string, operation: string): SpecChange => ({
      kind: 'deprecation',
      id,
      text: `${id.split('-')[0]} property \`${property}\` deprecated`,
      operation,
    });
    const used: Omit<ConnectorDrift, 'outcome'> = {
      ...drift,
      actions: [
        action('crawl', 'POST /crawl', {
          fieldUse: {
            'main POST /crawl': {
              read: ['status'],
              copied: [],
              returned: ['data'],
              sent: ['options', 'options/waitFor'],
            },
          },
        }),
        action('untracked', 'POST /crawl', { tracked: false }),
      ],
    };
    const reviewOf = reviewOfChange(used);
    const property = (id: string, name: string) =>
      reviewOf('main', deprecated(id, name, 'POST /crawl'));

    expect(
      property('request-property-deprecated', 'allOf[#/components/schemas/Options]/waitFor')
    ).toEqual({
      needsReview: true,
      actions: ['untracked'],
    });
    expect(property('request-property-deprecated', 'options/waitFor')).toEqual({
      needsReview: true,
      actions: ['crawl', 'untracked'],
    });
    expect(property('response-property-deprecated', 'data/items/language')).toEqual({
      needsReview: true,
      actions: ['crawl', 'untracked'],
    });
    expect(property('response-property-deprecated', 'meta/region')).toEqual({
      needsReview: true,
      actions: ['untracked'],
    });
  });

  it('always reviews deprecations, and changes no action calls unless every action passes', () => {
    expect(review('main', change('endpoint-deprecated', 'POST /crawl'))).toEqual({
      needsReview: true,
      actions: ['crawl'],
    });
    expect(review('main', change('request-parameter-max-decreased', 'POST /other'))).toEqual({
      needsReview: true,
      actions: [],
    });
    expect(
      reviewOfChange({ ...drift, verdict: 'healthy', actions: drift.actions?.slice(1, 2) })(
        'main',
        change('request-parameter-max-decreased', 'POST /other')
      )
    ).toEqual({ needsReview: false, actions: [] });
  });
});
