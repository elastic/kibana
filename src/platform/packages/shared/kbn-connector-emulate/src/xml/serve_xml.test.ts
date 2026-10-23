/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';

const xmlBody = (ref: string) => ({
  'application/xml': { schema: { $ref: `#/components/schemas/${ref}` } },
});

// A storage API shaped like S3: XML bodies, buckets in the host, and operations on the same path
// told apart by their query parameters.
const spec = {
  openapi: '3.0.3',
  info: { title: 'Storage', version: '1' },
  servers: [{ url: 'https://storage.example.com' }],
  paths: {
    '/{bucket}/{key}': {
      servers: [
        {
          url: 'https://{bucket}.storage.example.com',
          variables: { bucket: { default: 'b', 'x-path-parameter': true } },
        },
        { url: 'https://storage.example.com' },
      ],
      parameters: [
        { name: 'bucket', in: 'path', required: true, schema: { type: 'string' } },
        {
          name: 'key',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          'x-ms-skip-url-encoding': true,
        },
      ],
      get: {
        operationId: 'GetObject',
        responses: {
          '200': {
            description: 'ok',
            headers: { 'x-tags': { schema: { type: 'array', items: { type: 'string' } } } },
            content: {
              'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      head: { operationId: 'HeadObject', responses: { '200': { description: 'ok' } } },
      put: {
        operationId: 'PutTagging',
        requestBody: { required: true, content: xmlBody('Tagging') },
        responses: { '200': { description: 'ok', content: xmlBody('Tagging') } },
      },
    },
  },
  'x-ms-paths': {
    '/{bucket}/{key}?x-id=ListParts': {
      servers: [{ url: 'https://storage.example.com' }],
      get: {
        operationId: 'ListParts',
        'x-optional-fixed-query': ['x-id'],
        parameters: [
          { name: 'bucket', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'uploadId', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'ok', content: xmlBody('Tagging') } },
      },
    },
  },
  components: {
    schemas: {
      Tagging: {
        type: 'object',
        xml: { name: 'Tagging' },
        required: ['tags'],
        properties: {
          tags: {
            type: 'array',
            xml: { name: 'TagSet', wrapped: true },
            items: {
              type: 'object',
              xml: { name: 'Tag' },
              required: ['key'],
              properties: { key: { type: 'string', xml: { name: 'Key' } } },
            },
          },
        },
      },
    },
  },
};

describe('serving XML and host-addressed APIs', () => {
  it('validates XML requests and answers with XML written from samples', async () => {
    const { fetch, calls } = createEmulatorFetch({ specs: [spec] });

    const valid = await fetch('https://logs.storage.example.com/2024/app.log', {
      method: 'PUT',
      headers: { 'content-type': 'application/xml' },
      body: '<Tagging><TagSet><Tag><Key>env</Key></Tag></TagSet></Tagging>',
    });
    const invalid = await fetch('https://logs.storage.example.com/2024/app.log', {
      method: 'PUT',
      headers: { 'content-type': 'application/xml' },
      body: '<Tagging><TagSet><Tag></Tag></TagSet></Tagging>',
    });
    const malformed = await fetch('https://logs.storage.example.com/2024/app.log', {
      method: 'PUT',
      headers: { 'content-type': 'application/xml' },
      body: '<Tagging>',
    });

    expect(valid.status).toBe(200);
    expect(await valid.text()).toBe(
      '<Tagging><TagSet><Tag><Key>string</Key></Tag></TagSet></Tagging>'
    );
    expect(calls[0].matched).toEqual({ method: 'put', path: '/{bucket}/{key}' });
    expect(invalid.status).toBe(422);
    expect(calls[1].requestViolations.map(({ path }) => path.join('.'))).toEqual(['body.tags.0']);
    expect(malformed.status).toBe(422);
    expect(calls[2].requestViolations).toEqual([
      expect.objectContaining({ code: 'xml', path: ['body'] }),
    ]);
  });

  it('takes the leading path parameter from the host, or from the path on other servers', async () => {
    const { fetch, calls } = createEmulatorFetch({ specs: [spec] });

    await fetch('https://logs.storage.example.com/2024/app.log');
    await fetch('https://storage.example.com/logs/2024/app.log');
    const head = await fetch('https://logs.storage.example.com/2024/app.log', { method: 'HEAD' });

    expect(calls.map(({ operation, status }) => [operation, status])).toEqual([
      ['GetObject', 200],
      ['GetObject', 200],
      ['HeadObject', 200],
    ]);
    expect(await head.text()).toBe('');
  });

  it('tells operations on a path apart by optional fixed and required query parameters', async () => {
    const { fetch, calls } = createEmulatorFetch({ specs: [spec] });

    await fetch('https://storage.example.com/logs/app.log');
    await fetch('https://storage.example.com/logs/app.log?uploadId=1');
    await fetch('https://storage.example.com/logs/app.log?x-id=ListParts&uploadId=1');

    expect(calls.map(({ operation }) => operation)).toEqual([
      'GetObject',
      'ListParts',
      'ListParts',
    ]);
  });

  it('validates fixtures written as XML or as values, header lists and bodies without a type', async () => {
    const { fetch, calls, rejectedResponses } = createEmulatorFetch({
      specs: [spec],
      fixtures: [
        {
          operation: { method: 'get', path: '/{bucket}/{key}' },
          // No Content-Type: the only one the response declares.
          response: { status: 200, headers: { 'x-tags': 'a, b' }, body: 'bytes' },
        },
        {
          operation: { method: 'put', path: '/{bucket}/{key}' },
          response: {
            status: 200,
            headers: { 'content-type': 'application/xml' },
            body: { tags: [{ key: 'from-a-value' }] },
          },
        },
        {
          operation: { method: 'get', path: '/{bucket}/{key}?x-id=ListParts' },
          response: {
            status: 200,
            headers: { 'content-type': 'application/xml' },
            body: '<Tagging><TagSet/></Tagging>',
          },
        },
      ],
    });

    await fetch('https://storage.example.com/logs/app.log');
    const put = await fetch('https://storage.example.com/logs/app.log', {
      method: 'PUT',
      headers: { 'content-type': 'application/xml' },
      body: '<Tagging><TagSet/></Tagging>',
    });
    const parts = await fetch('https://storage.example.com/logs/app.log?uploadId=1');

    expect(rejectedResponses).toEqual([]);
    expect(calls.flatMap(({ responseViolations }) => responseViolations)).toEqual([]);
    expect(await put.text()).toBe(
      '<Tagging><TagSet><Tag><Key>from-a-value</Key></Tag></TagSet></Tagging>'
    );
    expect(await parts.text()).toBe('<Tagging><TagSet/></Tagging>');
  });
});
