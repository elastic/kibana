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

const ok = (description: string) => ({ '200': { description } });

// Shaped like Azure Blob Storage's data-plane spec, which has all its operations in `x-ms-paths`.
const blob = {
  swagger: '2.0',
  info: { title: 'Blob', version: '2021-12-02' },
  host: 'account.blob.core.windows.net',
  paths: {},
  'x-ms-paths': {
    '/?comp=list': {
      get: {
        operationId: 'Service_ListContainersSegment',
        parameters: [{ name: 'prefix', in: 'query', type: 'string' }],
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
    '/{containerName}?restype=container&comp=list&flat': {
      get: {
        operationId: 'Container_ListBlobFlatSegment',
        parameters: [{ name: 'containerName', in: 'path', required: true, type: 'string' }],
        responses: ok('blobs'),
      },
    },
    '/{containerName}/{blob}': {
      get: {
        operationId: 'Blob_Download',
        parameters: [
          { name: 'containerName', in: 'path', required: true, type: 'string' },
          {
            name: 'blob',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-skip-url-encoding': true,
          },
        ],
        responses: ok('blob'),
      },
    },
  },
};

describe('x-ms-paths', () => {
  const { fetch, calls } = createEmulatorFetch({ specs: [blob] });
  const send = (path: string, method = 'GET') =>
    fetch(`https://account.blob.core.windows.net${path}`, { method });

  afterEach(() => {
    calls.length = 0;
  });

  it('loads operations from x-ms-paths with the fixed query parameters of their keys', () => {
    const operations = loadContractOperations(blob);

    expect(
      operations.map(({ id, method, path, fixedQuery }) => ({ id, method, path, fixedQuery }))
    ).toEqual([
      {
        id: 'Service_ListContainersSegment',
        method: 'get',
        path: '/?comp=list',
        fixedQuery: [{ name: 'comp', value: 'list' }],
      },
      {
        id: 'Service_GetProperties',
        method: 'get',
        path: '/?restype=service&comp=properties',
        fixedQuery: [
          { name: 'restype', value: 'service' },
          { name: 'comp', value: 'properties' },
        ],
      },
      {
        id: 'Service_SetProperties',
        method: 'put',
        path: '/?restype=service&comp=properties',
        fixedQuery: [
          { name: 'restype', value: 'service' },
          { name: 'comp', value: 'properties' },
        ],
      },
      {
        id: 'Other_GetProperties',
        method: 'get',
        path: '/?comp=properties',
        fixedQuery: [{ name: 'comp', value: 'properties' }],
      },
      {
        id: 'Container_ListBlobFlatSegment',
        method: 'get',
        path: '/{containerName}?restype=container&comp=list&flat',
        fixedQuery: [
          { name: 'restype', value: 'container' },
          { name: 'comp', value: 'list' },
          { name: 'flat' },
        ],
      },
      {
        id: 'Blob_Download',
        method: 'get',
        path: '/{containerName}/{blob}',
        fixedQuery: undefined,
      },
    ]);
  });

  it('routes requests by their fixed query parameters, preferring the operation with most', async () => {
    expect((await send('/?comp=list&prefix=logs')).status).toBe(200);
    expect((await send('/?comp=properties&restype=service')).status).toBe(200);
    expect((await send('/?comp=properties')).status).toBe(200);
    expect((await send('/?restype=service&comp=properties', 'PUT')).status).toBe(200);
    expect((await send('/logs?restype=container&comp=list&flat')).status).toBe(200);
    expect((await send('/logs/2024/01/app.log')).status).toBe(200);

    expect(calls.map(({ operation }) => operation)).toEqual([
      'Service_ListContainersSegment',
      'Service_GetProperties',
      'Other_GetProperties',
      'Service_SetProperties',
      'Container_ListBlobFlatSegment',
      'Blob_Download',
    ]);
    expect(calls.flatMap(({ requestViolations }) => requestViolations)).toEqual([]);
    expect(calls[4].matched).toEqual({
      method: 'get',
      path: '/{containerName}?restype=container&comp=list&flat',
    });
  });

  it('answers 404 naming the expected query when none of the operations on the path match', async () => {
    const response = await send('/?comp=tags');

    expect(response.status).toBe(404);
    expect((await response.json()).detail).toBe(
      'GET https://account.blob.core.windows.net/: No operation matches the query; operations on the path expect /?comp=list, or /?restype=service&comp=properties, or /?comp=properties'
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
