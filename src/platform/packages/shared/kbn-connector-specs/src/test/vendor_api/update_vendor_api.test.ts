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
import type { UpdateVendorApiOptions } from './update_vendor_api';
import { updateVendorApi } from './update_vendor_api';

const BASE = 'https://api.example.com';
const SPEC_URL = 'https://specs.example.com/openapi.yaml';
const MODELS_URL = 'https://specs.example.com/models.yaml';

const specYaml = (version: string) => `
openapi: 3.0.3
info: { title: Example, version: '${version}' }
servers: [{ url: '${BASE}' }]
paths:
  /items:
    get:
      description: Lists items
      parameters: [{ name: page, in: query, schema: { type: integer } }]
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { type: array, items: { $ref: 'models.yaml#/Item' } }
  /tags:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { type: array, items: { type: string } }
  /unused:
    get:
      responses: { '204': { description: none } }
`;

const modelsYaml = `
Item:
  type: object
  properties: { name: { type: string } }
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
    listItems: {
      scope: 'read',
      input: z.object({}),
      handler: async ({ client }) => (await client.get(`${BASE}/items`)).data,
    },
  },
};

const withLegacy: ConnectorSpec = {
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

const withTags: ConnectorSpec = {
  ...connector,
  actions: {
    ...connector.actions,
    listTags: {
      scope: 'read',
      input: z.object({}),
      handler: async ({ client }) => (await client.get(`${BASE}/tags`)).data,
    },
  },
};

const itemsOperation = {
  source: 'main',
  method: 'get',
  path: '/items',
  pagination: { style: 'page', request: { pageParam: 'page' }, response: { itemsPath: '' } },
};

describe('updateVendorApi', () => {
  let directory: string;
  let documents: Record<string, string>;
  let fetched: string[];
  let warnings: string[];

  const update = (options: Partial<UpdateVendorApiOptions> = {}) =>
    updateVendorApi({
      connector,
      directory,
      fetchText: async (url) => {
        fetched.push(url);
        return documents[url];
      },
      now: () => new Date('2026-10-07T12:00:00.000Z'),
      log: { info: () => {}, warning: (message) => warnings.push(message) },
      ...options,
    });
  const readJson = async (file: string) =>
    JSON.parse(await fs.readFile(path.join(directory, file), 'utf8'));

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vendor-api-'));
    documents = { [SPEC_URL]: specYaml('1.0'), [MODELS_URL]: modelsYaml };
    fetched = [];
    warnings = [];
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('requires --source for a connector without a manifest', async () => {
    await expect(update()).rejects.toThrow('.example has no manifest.json yet');
  });

  it('fetches and bundles new sources, and writes the manifest and a projected snapshot', async () => {
    const result = await update({ sources: { main: SPEC_URL } });

    expect(result).toEqual({
      changed: ['snapshots/main.openapi.json', 'manifest.json'],
      problems: [],
    });
    expect(fetched).toEqual([SPEC_URL, MODELS_URL]);
    expect(await readJson('manifest.json')).toEqual({
      sources: {
        main: {
          format: 'openapi',
          url: SPEC_URL,
          apiVersion: '1.0',
          fetchedAt: '2026-10-07T12:00:00.000Z',
        },
      },
      operations: { listItems: [itemsOperation] },
    });
    const snapshot = await readJson('snapshots/main.openapi.json');
    expect(Object.keys(snapshot.paths)).toEqual(['/items']);
    expect(snapshot.paths['/items'].get.description).toBeUndefined();
    expect(snapshot.components.schemas.Item).toEqual(expect.objectContaining({ type: 'object' }));
  });

  it('records offline against the snapshots and changes nothing on a re-run', async () => {
    await update({ sources: { main: SPEC_URL } });
    fetched = [];

    expect(await update({ now: () => new Date('2027-01-01T00:00:00.000Z') })).toEqual({
      changed: [],
      problems: [],
    });
    expect(fetched).toEqual([]);
  });

  it('keeps fetchedAt while the snapshot is unchanged and updates it when it changes', async () => {
    await update({ sources: { main: SPEC_URL } });
    documents[SPEC_URL] = specYaml('1.1');

    const later = () => new Date('2027-01-01T00:00:00.000Z');
    expect((await update({ refresh: true, now: later })).changed).toEqual(['manifest.json']);
    expect((await readJson('manifest.json')).sources.main).toEqual(
      expect.objectContaining({ apiVersion: '1.1', fetchedAt: '2026-10-07T12:00:00.000Z' })
    );

    documents[MODELS_URL] = `${modelsYaml}  required: [name]\n`;
    await update({ refresh: true, now: later });
    expect((await readJson('manifest.json')).sources.main.fetchedAt).toBe(
      '2027-01-01T00:00:00.000Z'
    );
  });

  it('reports unmatched requests until the manifest explains them', async () => {
    await update({ sources: { main: SPEC_URL } });

    const { problems } = await update({ connector: withLegacy });
    expect(problems).toEqual([
      expect.stringContaining('legacy: GET /legacy matches no operation of any source'),
    ]);
    expect(problems[0]).toContain('rerun with --refresh');

    const manifest = await readJson('manifest.json');
    await fs.writeFile(
      path.join(directory, 'manifest.json'),
      JSON.stringify({
        ...manifest,
        unmatched: { legacy: [{ method: 'get', path: '/legacy', reason: 'Not documented' }] },
      })
    );
    expect((await update({ connector: withLegacy })).problems).toEqual([]);
    expect((await readJson('manifest.json')).unmatched).toEqual({
      legacy: [{ method: 'get', path: '/legacy', reason: 'Not documented' }],
    });
  });

  it('proposes pagination for review once, then keeps what the manifest declares', async () => {
    await update({ sources: { main: SPEC_URL } });
    expect(warnings).toEqual([
      'GET /items (main): proposed "pagination" from parameter and field names in manifest.json; review it',
    ]);

    const manifest = await readJson('manifest.json');
    const declared = {
      ...manifest,
      operations: { listItems: [{ ...itemsOperation, pagination: 'none' }] },
    };
    await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify(declared));
    warnings = [];

    expect((await update()).problems).toEqual([]);
    expect((await readJson('manifest.json')).operations).toEqual(declared.operations);
    expect(warnings).toEqual([]);
  });

  it('reports list-like operations it cannot propose pagination for', async () => {
    const { problems } = await update({ connector: withTags, sources: { main: SPEC_URL } });

    expect(problems).toEqual([
      'GET /tags (main) looks like it returns a collection, as it returns an array; declare its "pagination" in manifest.json, or "none" if it returns everything at once',
    ]);
  });

  it('records against the overlay but snapshots the vendor spec without it', async () => {
    await update({ sources: { main: SPEC_URL } });
    warnings = [];
    await fs.writeFile(
      path.join(directory, 'overlay.yaml'),
      `
overlay: 1.0.0
info: { title: Example fixes, version: '1' }
actions:
  - target: $.paths
    update:
      /legacy:
        get:
          responses: { '200': { description: ok } }
  - target: $.paths['/gone']
    remove: true
`
    );

    const { problems } = await update({ connector: withLegacy });

    expect(problems).toEqual([]);
    expect((await readJson('manifest.json')).operations.legacy).toEqual([
      { source: 'main', method: 'get', path: '/legacy' },
    ]);
    expect(Object.keys((await readJson('snapshots/main.openapi.json')).paths)).toEqual(['/items']);
    expect(warnings).toEqual([
      'overlay.yaml action 1 matches nothing in any source; the vendor may have fixed it',
    ]);
  });

  it('reports what would change in check mode without writing', async () => {
    await update({ sources: { main: SPEC_URL } });
    await fs.writeFile(path.join(directory, 'snapshots/old.openapi.json'), '{}');

    const before = await fs.readFile(path.join(directory, 'manifest.json'), 'utf8');
    const result = await update({ connector: withLegacy, check: true });

    expect(result.changed).toEqual(['manifest.json', 'snapshots/old.openapi.json']);
    expect(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8')).toBe(before);
    expect(await fs.readdir(path.join(directory, 'snapshots'))).toContain('old.openapi.json');
  });

  it('removes snapshots of sources that are gone', async () => {
    await update({ sources: { main: SPEC_URL } });
    await fs.writeFile(path.join(directory, 'snapshots/old.openapi.json'), '{}');

    expect((await update()).changed).toEqual(['snapshots/old.openapi.json']);
    expect(await fs.readdir(path.join(directory, 'snapshots'))).toEqual(['main.openapi.json']);
  });
});
