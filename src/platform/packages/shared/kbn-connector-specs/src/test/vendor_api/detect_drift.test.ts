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
import type { ConnectorSpec } from '../../connector_spec';
import type { DetectDriftOptions } from './detect_drift';
import { classifyChange, detectDrift } from './detect_drift';
import type { OasdiffEntry } from './run_oasdiff';
import { updateVendorApi } from './update_vendor_api';

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
    expect(await detect()).toEqual({
      connector: '.example',
      sources: { main: { status: 'unchanged' } },
      operationsChanged: false,
      snapshotProblems: [],
      latestProblems: [],
      verdict: 'healthy',
      overlayFindings: [],
      outcome: 'none',
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

    expect(await detect()).toEqual(
      expect.objectContaining({
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
      })
    );
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

    expect(await detect()).toEqual(
      expect.objectContaining({
        sources: { main: { status: 'unreachable', error: expect.stringContaining('404') } },
        verdict: 'unknown',
        outcome: 'issue',
      })
    );
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

    expect(await detect()).toEqual(
      expect.objectContaining({ sources: { main: { status: 'changed' } }, outcome: 'issue' })
    );
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
