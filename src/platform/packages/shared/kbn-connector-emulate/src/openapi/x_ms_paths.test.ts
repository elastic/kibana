/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import { loadContractOperations } from '.';
import { createOperationMatcher } from './match_operation';

const ok = (description: string) => ({ '200': { description } });

const container = { name: 'containerName', in: 'path', required: true, type: 'string' };
const blobName = {
  name: 'blob',
  in: 'path',
  required: true,
  type: 'string',
  'x-ms-skip-url-encoding': true,
};
// Azure declares the parameters its keys fix as required, with the one value they allow.
const only = (name: string, value: string, location = 'query') => ({
  name,
  in: location,
  required: true,
  type: 'string',
  enum: [value],
});

// Shaped like Azure Blob Storage's data-plane spec, which has all its operations in `x-ms-paths`.
// Bare tokens in its keys (`&flat`, `&acquire`, `?BlockBlob`) only tell keys apart for AutoRest;
// the requests the service takes carry the operation's discriminators as declared parameters.
const blob = {
  swagger: '2.0',
  info: { title: 'Blob', version: '2021-12-02' },
  host: 'account.blob.core.windows.net',
  paths: {},
  'x-ms-paths': {
    '/?comp=list': {
      get: {
        operationId: 'Service_ListContainersSegment',
        parameters: [only('comp', 'list'), { name: 'prefix', in: 'query', type: 'string' }],
        responses: ok('containers'),
      },
    },
    '/?restype=service&comp=properties': {
      get: { operationId: 'Service_GetProperties', responses: ok('properties') },
      put: { operationId: 'Service_SetProperties', responses: ok('set') },
    },
    '/?comp=properties': {
      get: { operationId: 'Other_GetProperties', responses: ok('other') },
    },
    '/?mode=a%2Fb': {
      get: { operationId: 'Encoded', responses: ok('encoded') },
    },
    '/{containerName}?restype=container': {
      get: {
        operationId: 'Container_GetProperties',
        parameters: [container, only('restype', 'container')],
        responses: ok('container'),
      },
      put: {
        operationId: 'Container_Create',
        parameters: [container, only('restype', 'container')],
        responses: ok('created'),
      },
    },
    '/{containerName}?restype=container&comp=list&flat': {
      get: {
        operationId: 'Container_ListBlobFlatSegment',
        parameters: [container, only('restype', 'container'), only('comp', 'list')],
        responses: ok('blobs'),
      },
    },
    '/{containerName}?restype=container&comp=list&hierarchy': {
      get: {
        operationId: 'Container_ListBlobHierarchySegment',
        parameters: [
          container,
          only('restype', 'container'),
          only('comp', 'list'),
          { name: 'delimiter', in: 'query', required: true, type: 'string' },
        ],
        responses: ok('blobs by prefix'),
      },
    },
    '/{containerName}?comp=lease&restype=container&acquire': {
      put: {
        operationId: 'Container_AcquireLease',
        parameters: [
          container,
          only('comp', 'lease'),
          only('restype', 'container'),
          only('x-ms-lease-action', 'acquire', 'header'),
        ],
        responses: ok('acquired'),
      },
    },
    '/{containerName}?comp=lease&restype=container&release': {
      put: {
        operationId: 'Container_ReleaseLease',
        parameters: [
          container,
          only('comp', 'lease'),
          only('restype', 'container'),
          only('x-ms-lease-action', 'release', 'header'),
          { name: 'x-ms-lease-id', in: 'header', required: true, type: 'string' },
        ],
        responses: ok('released'),
      },
    },
    '/{containerName}/{blob}': {
      get: {
        operationId: 'Blob_Download',
        parameters: [container, blobName],
        responses: ok('blob'),
      },
    },
    '/{containerName}/{blob}?BlockBlob': {
      put: {
        operationId: 'BlockBlob_Upload',
        parameters: [container, blobName, only('x-ms-blob-type', 'BlockBlob', 'header')],
        responses: ok('uploaded'),
      },
    },
    '/{containerName}/{blob}?PageBlob': {
      put: {
        operationId: 'PageBlob_Create',
        parameters: [
          container,
          blobName,
          only('x-ms-blob-type', 'PageBlob', 'header'),
          { name: 'x-ms-blob-content-length', in: 'header', required: true, type: 'integer' },
        ],
        responses: ok('page blob'),
      },
    },
  },
};

describe('x-ms-paths', () => {
  const { fetch, calls } = createEmulatorFetch({ specs: [blob] });
  const send = (path: string, method = 'GET', headers: Record<string, string> = {}) =>
    fetch(`https://account.blob.core.windows.net${path}`, { method, headers });

  afterEach(() => {
    calls.length = 0;
  });

  it('loads operations from x-ms-paths with the name=value pairs of their keys', () => {
    const operations = loadContractOperations(blob);
    const byId = new Map(operations.map(({ id, path, fixedQuery }) => [id, { path, fixedQuery }]));

    expect(byId.get('Service_GetProperties')).toEqual({
      path: '/?restype=service&comp=properties',
      fixedQuery: [
        { name: 'restype', value: 'service' },
        { name: 'comp', value: 'properties' },
      ],
    });
    // Bare tokens are left out: clients don't send them.
    expect(byId.get('Container_ListBlobFlatSegment')).toEqual({
      path: '/{containerName}?restype=container&comp=list&flat',
      fixedQuery: [
        { name: 'restype', value: 'container' },
        { name: 'comp', value: 'list' },
      ],
    });
    expect(byId.get('BlockBlob_Upload')).toEqual({
      path: '/{containerName}/{blob}?BlockBlob',
      fixedQuery: undefined,
    });
    // Values are decoded as a request's query is.
    expect(byId.get('Encoded')?.fixedQuery).toEqual([{ name: 'mode', value: 'a/b' }]);
    expect(byId.get('Blob_Download')?.fixedQuery).toBeUndefined();
  });

  it('routes the requests clients send to the operation their parameters select', async () => {
    const requests: Array<[string, string?, Record<string, string>?]> = [
      ['/?comp=list&prefix=logs'],
      ['/?comp=properties&restype=service'],
      ['/?comp=properties'],
      ['/?restype=service&comp=properties', 'PUT'],
      ['/?mode=a%2Fb'],
      ['/logs?restype=container'],
      ['/logs?restype=container', 'PUT'],
      ['/logs?restype=container&comp=list'],
      ['/logs?restype=container&comp=list&delimiter=%2F'],
      ['/logs?comp=lease&restype=container', 'PUT', { 'x-ms-lease-action': 'acquire' }],
      [
        '/logs?comp=lease&restype=container',
        'PUT',
        { 'x-ms-lease-action': 'release', 'x-ms-lease-id': 'lease-1' },
      ],
      ['/logs/2024/01/app.log'],
      ['/logs/app.log', 'PUT', { 'x-ms-blob-type': 'BlockBlob' }],
      [
        '/logs/disk.vhd',
        'PUT',
        { 'x-ms-blob-type': 'PageBlob', 'x-ms-blob-content-length': '512' },
      ],
    ];
    for (const [path, method, headers] of requests) {
      expect((await send(path, method, headers)).status).toBe(200);
    }

    expect(calls.map(({ operation }) => operation)).toEqual([
      'Service_ListContainersSegment',
      'Service_GetProperties',
      'Other_GetProperties',
      'Service_SetProperties',
      'Encoded',
      'Container_GetProperties',
      'Container_Create',
      'Container_ListBlobFlatSegment',
      'Container_ListBlobHierarchySegment',
      'Container_AcquireLease',
      'Container_ReleaseLease',
      'Blob_Download',
      'BlockBlob_Upload',
      'PageBlob_Create',
    ]);
    expect(calls.flatMap(({ requestViolations }) => requestViolations)).toEqual([]);
    expect(calls[7].matched).toEqual({
      method: 'get',
      path: '/{containerName}?restype=container&comp=list&flat',
    });
  });

  it('routes a request missing a discriminator to an operation it fits, whose validation names it', async () => {
    const response = await send('/logs?comp=lease&restype=container', 'PUT');

    expect(response.status).toBe(422);
    expect(calls[0].operation).toBe('Container_AcquireLease');
    expect(calls[0].requestViolations).toEqual([
      expect.objectContaining({ path: ['header', 'x-ms-lease-action'], code: 'required' }),
    ]);
  });

  it('still routes a request whose discriminator no operation allows, so validation names it', async () => {
    const response = await send('/logs/app.log', 'PUT', { 'x-ms-blob-type': 'AppendBlob' });

    expect(response.status).toBe(422);
    expect(calls[0].operation).toBe('BlockBlob_Upload');
    expect(calls[0].requestViolations).toEqual([
      expect.objectContaining({ path: ['header', 'x-ms-blob-type'], code: 'enum' }),
    ]);
  });

  it('answers 404 naming the expected query when none of the operations on the path match', async () => {
    const response = await send('/?comp=tags');

    expect(response.status).toBe(404);
    expect((await response.json()).detail).toBe(
      'GET https://account.blob.core.windows.net/: No operation matches the query; operations on the path expect /?comp=list, or /?restype=service&comp=properties, or /?comp=properties, or /?mode=a%2Fb'
    );
  });

  it('answers 405 listing the methods of the operations the query matches', async () => {
    const response = await send('/?comp=list', 'DELETE');

    expect(response.status).toBe(405);
    expect((await response.json()).detail).toMatch(/The path only allows GET$/);
  });

  it('still reports query parameters the operation does not declare', async () => {
    await send('/?comp=list&marker=next');

    expect(calls[0].requestViolations).toEqual([
      expect.objectContaining({ path: ['query', 'marker'], code: 'undeclared' }),
    ]);
  });

  describe('when telling operations apart', () => {
    const openApi = (document: Record<string, unknown>) => ({
      openapi: '3.0.3',
      info: { title: 'Vendor', version: '1' },
      servers: [{ url: 'https://vendor.example' }],
      ...document,
    });
    const header = (name: string, schema: Record<string, unknown>) => ({
      name,
      in: 'header',
      required: true,
      schema,
    });
    const route = async (document: Record<string, unknown>, path: string, init?: RequestInit) => {
      const emulator = createEmulatorFetch({ specs: [openApi(document)] });
      const { status } = await emulator.fetch(`https://vendor.example${path}`, init);
      return { status, operation: emulator.calls[0].operation };
    };

    it('follows $ref chains to the one value a parameter allows', async () => {
      const lease = (action: string) => ({
        put: {
          operationId: `Lease_${action}`,
          parameters: [
            header('x-ms-lease-action', { $ref: `#/components/schemas/${action}Alias` }),
          ],
          responses: ok(action),
        },
      });
      const document = {
        paths: {},
        'x-ms-paths': {
          '/c?comp=lease&acquire': lease('Acquire'),
          '/c?comp=lease&release': lease('Release'),
        },
        components: {
          schemas: {
            AcquireAlias: { $ref: '#/components/schemas/Acquire' },
            Acquire: { type: 'string', enum: ['acquire'] },
            ReleaseAlias: { $ref: '#/components/schemas/Release' },
            Release: { type: 'string', enum: ['release'] },
          },
        },
      };

      expect(
        await route(document, '/c?comp=lease', {
          method: 'PUT',
          headers: { 'x-ms-lease-action': 'release' },
        })
      ).toEqual({ status: 200, operation: 'Lease_Release' });
    });

    it('applies the enum next to a $ref in OpenAPI 3.1, and stops at $ref cycles', async () => {
      const lease = (action: string, schema: Record<string, unknown>) => ({
        put: {
          operationId: `Lease_${action}`,
          parameters: [header('x-ms-lease-action', schema)],
          responses: ok(action),
        },
      });
      const document = {
        openapi: '3.1.0',
        paths: {},
        'x-ms-paths': {
          '/c?comp=lease&acquire': lease('Acquire', {
            $ref: '#/components/schemas/Action',
            enum: ['acquire'],
          }),
          '/c?comp=lease&release': lease('Release', {
            $ref: '#/components/schemas/Action',
            enum: ['release'],
          }),
          '/d?comp=lease&loop': lease('Loop', { $ref: '#/components/schemas/Loop' }),
        },
        components: {
          schemas: {
            Action: { type: 'string' },
            Loop: { $ref: '#/components/schemas/Loop' },
          },
        },
      };

      expect(
        await route(document, '/c?comp=lease', {
          method: 'PUT',
          headers: { 'x-ms-lease-action': 'release' },
        })
      ).toEqual({ status: 200, operation: 'Lease_Release' });
      // The router stops at the cycle; validation isn't reached here.
      const match = createOperationMatcher(loadContractOperations(openApi(document)));
      const routed = match('put', new URL('https://vendor.example/d?comp=lease'), {
        'x-ms-lease-action': 'acquire',
      });
      expect('operation' in routed && routed.operation.id).toBe('Lease_Loop');
    });

    it('prefers the more specific path template before looking at discriminators', async () => {
      const document = {
        paths: {
          '/items/new': {
            get: {
              operationId: 'getNewItem',
              parameters: [
                {
                  name: 'mode',
                  in: 'query',
                  required: true,
                  schema: { type: 'string', enum: ['full'] },
                },
              ],
              responses: ok('new'),
            },
          },
          '/items/{id}': {
            get: {
              operationId: 'getItem',
              parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
              responses: ok('item'),
            },
          },
        },
      };

      // Validation of the literal endpoint names the wrong value, rather than `/items/{id}`
      // taking the request.
      expect(await route(document, '/items/new?mode=brief')).toEqual({
        status: 422,
        operation: 'getNewItem',
      });
    });

    it('prefers the operation with more fixed query parameters before counting the others', async () => {
      const optional = (name: string, location: string) => ({
        name,
        in: location,
        schema: { type: 'string' },
      });
      const document = {
        paths: {
          '/': {
            get: {
              operationId: 'Root',
              parameters: [optional('comp', 'query'), optional('x-ms-version', 'header')],
              responses: ok('root'),
            },
          },
        },
        'x-ms-paths': {
          '/?comp=list': { get: { operationId: 'List', responses: ok('list') } },
        },
      };

      expect(
        await route(document, '/?comp=list', { headers: { 'x-ms-version': '2021-12-02' } })
      ).toEqual({ status: 200, operation: 'List' });
    });
  });

  it('loads x-ms-paths of OpenAPI 3 documents', () => {
    const operations = loadContractOperations({
      openapi: '3.0.3',
      info: { title: 'Blob', version: '1' },
      servers: [{ url: 'https://account.blob.core.windows.net' }],
      paths: { '/': { get: { operationId: 'Root', responses: ok('root') } } },
      'x-ms-paths': {
        '/?comp=list': { get: { operationId: 'List', responses: ok('list') } },
      },
    });

    expect(operations.map(({ id, path }) => [id, path])).toEqual([
      ['Root', '/'],
      ['List', '/?comp=list'],
    ]);
  });
});
