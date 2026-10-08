/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContractMockFetch } from '../fetch/create_contract_mock_fetch';

const spec = {
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/report': {
      get: {
        responses: {
          '404': { description: 'missing' },
          '202': {
            description: 'accepted',
            headers: {
              'X-Request-Id': { required: true, schema: { type: 'string', format: 'uuid' } },
            },
            content: {
              'text/csv': { schema: { type: 'string', example: 'a,b' } },
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['rows'],
                  properties: { rows: { type: 'integer' } },
                },
              },
            },
          },
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/empty': { delete: { responses: { '204': { description: 'deleted' } } } },
  },
};

describe('sampleResponse', () => {
  const { fetch, calls } = createContractMockFetch({ specs: [spec] });

  afterEach(() => {
    calls.length = 0;
  });

  it('answers with the lowest 2xx response, preferring JSON for wildcard Accept', async () => {
    const response = await fetch('https://api.example.com/report', { headers: { accept: '*/*' } });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(calls[0].responseViolations).toEqual([]);
  });

  it('honours Accept and samples required headers', async () => {
    const { fetch: reportFetch } = createContractMockFetch({
      specs: [
        {
          ...spec,
          paths: {
            '/report': {
              get: { responses: { '202': spec.paths['/report'].get.responses['202'] } },
            },
          },
        },
      ],
    });

    const response = await reportFetch('https://api.example.com/report', {
      headers: { accept: 'text/csv;q=0.9, application/xml' },
    });

    expect(response.status).toBe(202);
    expect(await response.text()).toBe('a,b');
    expect(response.headers.get('x-request-id')).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('answers 406 when no content type is acceptable', async () => {
    const response = await fetch('https://api.example.com/report', {
      headers: { accept: 'application/xml' },
    });

    expect(response.status).toBe(406);
    expect((await response.json()).detail).toContain('application/json');
  });

  it('answers vendor JSON types the spec does not declare with its JSON content', async () => {
    const response = await fetch('https://api.example.com/report', {
      headers: { accept: 'application/vnd.github+json' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
  });

  it('answers without a body when the response declares no content', async () => {
    const response = await fetch('https://api.example.com/empty', { method: 'DELETE' });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('serves the first media type example that matches the schema, following refs', async () => {
    const { fetch: exampleFetch } = createContractMockFetch({
      specs: [
        {
          ...spec,
          paths: {
            '/count': {
              get: {
                responses: {
                  '200': {
                    description: 'ok',
                    content: {
                      'application/json': {
                        schema: { type: 'object', required: ['count'] },
                        example: { total: 1 },
                        examples: { real: { $ref: '#/components/examples/Count' } },
                      },
                    },
                  },
                },
              },
            },
          },
          components: { examples: { Count: { value: { count: 3 } } } },
        },
      ],
    });

    expect(await (await exampleFetch('https://api.example.com/count')).json()).toEqual({
      count: 3,
    });
  });

  it('skips schema examples that contradict their schema and keeps samples in bounds', async () => {
    const member = {
      type: 'object',
      required: ['id'],
      // Trello's style: examples that break the schema they illustrate.
      example: { name: 'no id' },
      properties: {
        id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '5abbe4b7ddc1b351ef961414' },
        joined: { type: 'string', format: 'date', example: '2018-04-26T17:03:25.155Z' },
        count: { type: 'string', example: 0, default: '0' },
        score: { type: 'integer', minimum: 1, maximum: 10, multipleOf: 5 },
        tags: { type: 'array', items: { type: 'string' }, maxItems: 0 },
        // The first variant's sample matches both variants, the second's only the second.
        badge: {
          oneOf: [
            {
              type: 'object',
              additionalProperties: false,
              properties: { label: { type: 'string' } },
            },
            {
              type: 'object',
              properties: { label: { type: 'string' }, url: { type: 'string' } },
            },
          ],
        },
      },
    };
    const memberMock = createContractMockFetch({
      specs: [
        {
          openapi: '3.0.3',
          info: { title: 'Test', version: '1' },
          servers: [{ url: 'https://api.example.com' }],
          paths: {
            '/member': {
              get: {
                responses: {
                  '200': {
                    description: 'ok',
                    content: { 'application/json': { schema: member } },
                  },
                },
              },
            },
          },
        },
      ],
    });

    const body = await (await memberMock.fetch('https://api.example.com/member')).json();

    expect(body).toEqual({
      id: '5abbe4b7ddc1b351ef961414',
      joined: '2026-01-01',
      count: '0',
      score: 5,
      tags: [],
      badge: { label: 'string', url: 'string' },
    });
    expect(memberMock.calls[0].responseViolations).toEqual([]);
  });
});
