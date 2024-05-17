/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { OasConverter } from './oas_converter';
import { type InternalRouterRoute, extractResponses } from './process_router';

describe('extractResponses', () => {
  let oasConverter: OasConverter;
  beforeEach(() => {
    oasConverter = new OasConverter();
  });
  test('handles full response config as expected', () => {
    const route: InternalRouterRoute = {
      path: '/foo',
      handler: jest.fn(),
      isVersioned: false,
      method: 'get',
      options: {
        body: { access: ['application/test+json'] } as any,
      },
      validationSchemas: () => ({
        request: {
          body: schema.object({ foo: schema.string() }),
        },
        response: {
          200: {
            bodyContentType: 'application/test+json',
            body: () => schema.object({ bar: schema.number({ min: 1, max: 99 }) }),
          },
          404: {
            bodyContentType: 'application/test2+json',
            body: () => schema.object({ ok: schema.literal(false) }),
          },
          unsafe: { body: false },
        },
      }),
    };
    expect(extractResponses(route, oasConverter)).toEqual({
      200: {
        description: 'No description',
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
        },
      },
      404: {
        description: 'No description',
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
    });
  });
});
