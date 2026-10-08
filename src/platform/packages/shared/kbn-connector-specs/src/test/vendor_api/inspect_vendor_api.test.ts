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
import { parse } from 'yaml';
import type { InspectVendorApiOptions } from './inspect_vendor_api';
import { inspectVendorApi, LIST_LIMIT } from './inspect_vendor_api';

const SPEC_URL = 'https://specs.example.com/openapi.yaml';
const SWAGGER_URL = 'https://specs.example.com/swagger.json';

const specYaml = `
openapi: 3.0.3
info: { title: Example, version: '2.1' }
paths:
  /items:
    get:
      operationId: listItems
      summary: Lists items
      parameters: [{ name: limit, in: query, schema: { type: integer } }]
      responses: { '200': { description: ok } }
  /tags:
    post:
      operationId: createTag
      responses: { '201': { description: created } }
`;

const swagger = {
  swagger: '2.0',
  info: { title: 'Legacy', version: '1' },
  host: 'legacy.example.com',
  paths: {
    '/things': {
      get: {
        parameters: [
          {
            name: 'ids',
            in: 'query',
            type: 'array',
            items: { type: 'string' },
            collectionFormat: 'csv',
          },
        ],
        responses: { '200': { description: 'ok' } },
      },
    },
  },
};

const inspect = (options: Partial<InspectVendorApiOptions>) =>
  inspectVendorApi({
    sources: { v1: SPEC_URL },
    operations: [],
    fetchText: async (url) => {
      if (url === SPEC_URL) {
        return specYaml;
      }
      if (url === SWAGGER_URL) {
        return JSON.stringify(swagger);
      }
      throw new Error(`unexpected fetch of ${url}`);
    },
    log: { info: () => {} },
    ...options,
  });

describe('inspectVendorApi', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'inspect-vendor-api-'));
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('lists the operations of each source', async () => {
    const { output, problems } = await inspect({});
    expect(problems).toEqual([]);
    expect(output).toBe(
      [
        'v1: Example 2.1, 2 operation(s)',
        '  GET     /items  listItems  Lists items',
        '  POST    /tags  createTag',
      ].join('\n')
    );
  });

  it('lists only the operations matching --grep', async () => {
    const { output } = await inspect({ grep: 'TAG' });
    expect(output).toBe(
      ['v1: Example 2.1, 1 operation(s)', '  POST    /tags  createTag'].join('\n')
    );
  });

  it('cuts long lists short', async () => {
    const paths = Object.fromEntries(
      Array.from({ length: LIST_LIMIT + 3 }, (_, i) => [`/p${i}`, { get: { responses: {} } }])
    );
    const { output } = await inspect({
      fetchText: async () => JSON.stringify({ openapi: '3.0.3', info: { title: 'Big' }, paths }),
    });
    expect(output).toContain(`Big, ${LIST_LIMIT + 3} operation(s)`);
    expect(output.split('\n')).toHaveLength(LIST_LIMIT + 2);
    expect(output).toContain('… 3 more; narrow the list with --grep');
  });

  it('describes the requested operations as YAML', async () => {
    const { output, problems } = await inspect({ operations: ['listItems'] });
    expect(problems).toEqual([]);
    expect(parse(output)).toMatchObject({
      source: 'v1',
      operation: 'GET /items',
      parameters: [{ name: 'limit', in: 'query', style: 'form', explode: true }],
    });
  });

  it('converts Swagger 2.0 before describing it', async () => {
    const { output } = await inspect({
      sources: { legacy: SWAGGER_URL },
      operations: ['GET /things'],
    });
    expect(parse(output)).toMatchObject({
      servers: [{ url: 'https://legacy.example.com' }],
      parameters: [{ name: 'ids', style: 'form', explode: false }],
    });
  });

  it('reports operations no source has', async () => {
    const { problems } = await inspect({ operations: ['DELETE /items'] });
    expect(problems).toEqual(['DELETE /items matches no operation of v1; list them with --grep']);
  });

  it("uses a connector's manifest sources and applies its overlay", async () => {
    await fs.writeFile(
      path.join(directory, 'manifest.json'),
      JSON.stringify({
        sources: {
          v1: { format: 'openapi', url: SPEC_URL, fetchedAt: '2026-10-08T00:00:00.000Z' },
        },
        operations: {},
      })
    );
    await fs.writeFile(
      path.join(directory, 'overlay.yaml'),
      `overlay: 1.0.0
info: { title: Corrections, version: 1.0.0 }
actions:
  - target: $.paths['/items'].get.parameters[?@.name == 'limit'].schema
    description: The docs say at most 100.
    update: { maximum: 100 }
`
    );
    const { output } = await inspect({ sources: {}, directory, operations: ['listItems'] });
    expect(parse(output)).toMatchObject({
      parameters: [{ name: 'limit', schema: { type: 'integer', maximum: 100 } }],
    });
  });
});
