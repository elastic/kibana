/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall, OpenApiDocument } from '@kbn/connector-emulate';
import { checkInputStrictness } from './check_input_strictness';

const call = (method: string, path: string, url: string, source = 'v1'): ContractCall =>
  ({
    request: `${method.toUpperCase()} ${url}`,
    matched: { method: method.toLowerCase(), path, source },
  } as ContractCall);

const document = (paths: Record<string, unknown>, components?: unknown): OpenApiDocument =>
  ({ openapi: '3.0.0', paths, ...(components === undefined ? {} : { components }) } as OpenApiDocument);

describe('checkInputStrictness', () => {
  it('reports an input with no format where the vendor requires a uuid', () => {
    const problems = checkInputStrictness({
      inputSchema: { type: 'object', properties: { jobId: { type: 'string' } } },
      runs: [
        {
          input: { jobId: '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b' },
          calls: [call('get', '/v3/jobs/{job_id}', 'https://x.test/v3/jobs/3f2a')],
        },
      ],
      documents: {
        v1: document({
          '/v3/jobs/{job_id}': {
            get: {
              parameters: [
                { name: 'job_id', in: 'path', schema: { type: 'string', format: 'uuid' } },
              ],
            },
          },
        }),
      },
    });
    expect(problems).toEqual([
      {
        input: 'jobId',
        operation: 'GET /v3/jobs/{job_id}',
        parameter: 'path job_id',
        gap: { keyword: 'format', vendor: 'uuid', connector: 'nothing' },
      },
    ]);
  });

  it('follows a renamed input through the request URL', () => {
    const problems = checkInputStrictness({
      inputSchema: { type: 'object', properties: { cardId: { type: 'string' } } },
      runs: [
        {
          input: { cardId: '5abbe4b7ddc1b351ef961415' },
          calls: [
            call('get', '/cards/{id}', 'https://api.trello.com/1/cards/5abbe4b7ddc1b351ef961415'),
          ],
        },
      ],
      documents: {
        v1: document({
          '/cards/{id}': {
            get: {
              parameters: [
                { name: 'id', in: 'path', schema: { type: 'string', pattern: '^[0-9a-f]{24}$' } },
              ],
            },
          },
        }),
      },
    });
    expect(problems).toEqual([
      {
        input: 'cardId',
        operation: 'GET /cards/{id}',
        parameter: 'path id',
        gap: { keyword: 'pattern', vendor: '^[0-9a-f]{24}$', connector: 'nothing' },
      },
    ]);
  });

  it('matches a query parameter whose spelling differs', () => {
    const problems = checkInputStrictness({
      inputSchema: { type: 'object', properties: { pageSize: { type: 'integer' } } },
      runs: [{ input: { pageSize: 10 }, calls: [call('get', '/items', 'https://x.test/items')] }],
      documents: {
        v1: document({
          '/items': {
            get: {
              parameters: [
                { name: 'page_size', in: 'query', schema: { type: 'integer', maximum: 100 } },
              ],
            },
          },
        }),
      },
    });
    expect(problems).toMatchObject([
      { input: 'pageSize', parameter: 'query page_size', gap: { keyword: 'maximum' } },
    ]);
  });

  it('compares request body properties and resolves their refs', () => {
    const problems = checkInputStrictness({
      inputSchema: { type: 'object', properties: { start: { type: 'string' } } },
      runs: [
        { input: { start: '2026-11-17' }, calls: [call('post', '/downtime', 'https://x.test/downtime')] },
      ],
      documents: {
        v1: document(
          {
            '/downtime': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: { start: { $ref: '#/components/schemas/Timestamp' } },
                      },
                    },
                  },
                },
              },
            },
          },
          { schemas: { Timestamp: { type: 'string', format: 'date-time' } } }
        ),
      },
    });
    expect(problems).toMatchObject([
      { input: 'start', parameter: 'body start', gap: { keyword: 'format', vendor: 'date-time' } },
    ]);
  });

  it('says nothing when the input is already at least as strict', () => {
    expect(
      checkInputStrictness({
        inputSchema: {
          type: 'object',
          properties: { jobId: { type: 'string', format: 'uuid' } },
        },
        runs: [
          {
            input: { jobId: '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b' },
            calls: [call('get', '/jobs/{job_id}', 'https://x.test/jobs/3f2a')],
          },
        ],
        documents: {
          v1: document({
            '/jobs/{job_id}': {
              get: {
                parameters: [
                  { name: 'job_id', in: 'path', schema: { type: 'string', format: 'uuid' } },
                ],
              },
            },
          }),
        },
      })
    ).toEqual([]);
  });

  it('leaves out an input the connector declares deliberately loose', () => {
    const options = {
      inputSchema: { type: 'object', properties: { jobId: { type: 'string' } } },
      runs: [
        {
          input: { jobId: 'abc' },
          calls: [call('get', '/jobs/{job_id}', 'https://x.test/jobs/abc')],
        },
      ],
      documents: {
        v1: document({
          '/jobs/{job_id}': {
            get: {
              parameters: [
                { name: 'job_id', in: 'path', schema: { type: 'string', format: 'uuid' } },
              ],
            },
          },
        }),
      },
    };
    expect(checkInputStrictness(options)).toHaveLength(1);
    expect(checkInputStrictness({ ...options, allowed: ['jobId'] })).toEqual([]);
  });

  it('says nothing about an operation no call matched', () => {
    expect(
      checkInputStrictness({
        inputSchema: { type: 'object', properties: { jobId: { type: 'string' } } },
        runs: [{ input: { jobId: 'abc' }, calls: [] }],
        documents: {
          v1: document({
            '/jobs/{job_id}': {
              get: {
                parameters: [
                  { name: 'job_id', in: 'path', schema: { type: 'string', format: 'uuid' } },
                ],
              },
            },
          }),
        },
      })
    ).toEqual([]);
  });

  it('reports each gap once however many runs found it', () => {
    const one = {
      input: { jobId: 'abc' },
      calls: [call('get', '/jobs/{job_id}', 'https://x.test/jobs/abc')],
    };
    expect(
      checkInputStrictness({
        inputSchema: { type: 'object', properties: { jobId: { type: 'string' } } },
        runs: [one, { ...one, input: { jobId: 'def' } }],
        documents: {
          v1: document({
            '/jobs/{job_id}': {
              get: {
                parameters: [
                  { name: 'job_id', in: 'path', schema: { type: 'string', format: 'uuid' } },
                ],
              },
            },
          }),
        },
      })
    ).toHaveLength(1);
  });

  it('compares an array input against the item rules of the field it feeds', () => {
    expect(
      checkInputStrictness({
        inputSchema: {
          type: 'object',
          properties: { tags: { type: 'array', items: { type: 'string' } } },
        },
        runs: [
          { input: { tags: ['a'] }, calls: [call('post', '/scan', 'https://x.test/scan')] },
        ],
        documents: {
          v1: document({
            '/scan': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: { tags: { type: 'string', maxLength: 30 } },
                      },
                    },
                  },
                },
              },
            },
          }),
        },
      })
    ).toMatchObject([{ input: 'tags', gap: { keyword: 'maxLength', vendor: '30' } }]);
  });
});
