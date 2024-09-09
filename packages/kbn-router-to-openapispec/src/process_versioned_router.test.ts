/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type {
  CoreVersionedRouter,
  VersionedRouterRoute,
} from '@kbn/core-http-router-server-internal';
import { get } from 'lodash';
import { OasConverter } from './oas_converter';
import { createOperationIdCounter } from './operation_id_counter';
import {
  processVersionedRouter,
  extractVersionedResponses,
  extractVersionedRequestBodies,
} from './process_versioned_router';

let oasConverter: OasConverter;
beforeEach(() => {
  oasConverter = new OasConverter();
});

describe('extractVersionedRequestBodies', () => {
  test('handles full request config as expected', () => {
    expect(
      extractVersionedRequestBodies(createTestRoute(), oasConverter, ['application/json'])
    ).toEqual({
      'application/json; Elastic-Api-Version=2023-10-31': {
        schema: {
          additionalProperties: false,
          properties: {
            foo: {
              type: 'string',
            },
          },
          required: ['foo'],
          type: 'object',
        },
      },
      'application/json; Elastic-Api-Version=2024-12-31': {
        schema: {
          additionalProperties: false,
          properties: {
            foo2: {
              type: 'string',
            },
          },
          required: ['foo2'],
          type: 'object',
        },
      },
    });
  });
});

describe('extractVersionedResponses', () => {
  test('handles full response config as expected', () => {
    expect(
      extractVersionedResponses(createTestRoute(), oasConverter, ['application/test+json'])
    ).toEqual({
      200: {
        description: 'OK response 2023-10-31\nOK response 2024-12-31', // merge multiple version descriptions
        content: {
          'application/test+json; Elastic-Api-Version=2023-10-31': {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                bar: { type: 'number', minimum: 1, maximum: 99 },
              },
              required: ['bar'],
            },
          },
          'application/test+json; Elastic-Api-Version=2024-12-31': {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                bar2: { type: 'number', minimum: 1, maximum: 99 },
              },
              required: ['bar2'],
            },
          },
        },
      },
      404: {
        description: 'Not Found response 2023-10-31',
        content: {
          'application/test2+json; Elastic-Api-Version=2023-10-31': {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                ok: { type: 'boolean', enum: [false] },
              },
              required: ['ok'],
            },
          },
        },
      },
      500: {
        content: {
          'application/test2+json; Elastic-Api-Version=2024-12-31': {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                ok: { type: 'boolean', enum: [false] },
              },
              required: ['ok'],
            },
          },
        },
      },
    });
  });
});

describe('processVersionedRouter', () => {
  it('correctly extracts the version based on the version filter', () => {
    const baseCase = processVersionedRouter(
      { getRoutes: () => [createTestRoute()] } as unknown as CoreVersionedRouter,
      new OasConverter(),
      createOperationIdCounter(),
      {}
    );

    expect(Object.keys(get(baseCase, 'paths["/foo"].get.responses.200.content'))).toEqual([
      'application/test+json; Elastic-Api-Version=2023-10-31',
      'application/test+json; Elastic-Api-Version=2024-12-31',
    ]);

    const filteredCase = processVersionedRouter(
      { getRoutes: () => [createTestRoute()] } as unknown as CoreVersionedRouter,
      new OasConverter(),
      createOperationIdCounter(),
      { version: '2023-10-31' }
    );
    expect(Object.keys(get(filteredCase, 'paths["/foo"].get.responses.200.content'))).toEqual([
      'application/test+json; Elastic-Api-Version=2023-10-31',
    ]);
  });
});

const createTestRoute: () => VersionedRouterRoute = () => ({
  path: '/foo',
  method: 'get',
  options: {
    access: 'public',
    options: { body: { access: ['application/test+json'] } as any },
  },
  handlers: [
    {
      fn: jest.fn(),
      options: {
        version: '2023-10-31',
        validate: () => ({
          request: {
            body: schema.object({ foo: schema.string() }),
          },
          response: {
            200: {
              description: 'OK response 2023-10-31',
              bodyContentType: 'application/test+json',
              body: () => schema.object({ bar: schema.number({ min: 1, max: 99 }) }),
            },
            404: {
              description: 'Not Found response 2023-10-31',
              bodyContentType: 'application/test2+json',
              body: () => schema.object({ ok: schema.literal(false) }),
            },
            unsafe: { body: false },
          },
        }),
      },
    },
    {
      fn: jest.fn(),
      options: {
        version: '2024-12-31',
        validate: () => ({
          request: {
            body: schema.object({ foo2: schema.string() }),
          },
          response: {
            200: {
              description: 'OK response 2024-12-31',
              bodyContentType: 'application/test+json',
              body: () => schema.object({ bar2: schema.number({ min: 1, max: 99 }) }),
            },
            500: {
              bodyContentType: 'application/test2+json',
              body: () => schema.object({ ok: schema.literal(false) }),
            },
            unsafe: { body: false },
          },
        }),
      },
    },
  ],
});
