/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouterRoute, VersionedRouterRoute } from '@kbn/core-http-server';
import { extractRouteQueryParameters } from './extract_route_query_parameters';

describe('extractRouteQueryParameters', () => {
  it('returns an empty array for a route without a query schema', () => {
    const route = {
      path: '/foo',
      method: 'get',
      isVersioned: false,
      options: {},
      handler: jest.fn(),
      validationSchemas: { request: { body: schema.object({ name: schema.string() }) } },
    } as unknown as RouterRoute;

    expect(extractRouteQueryParameters(route)).toEqual([]);
  });

  it('maps enum, boolean and free-form query params from a config-schema route', () => {
    const route = {
      path: '/foo',
      method: 'get',
      isVersioned: false,
      options: {},
      handler: jest.fn(),
      validationSchemas: {
        request: {
          query: schema.object({
            perPage: schema.number(),
            sortOrder: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
            internal: schema.boolean(),
            query: schema.maybe(schema.string()),
          }),
        },
      },
    } as unknown as RouterRoute;

    expect(extractRouteQueryParameters(route)).toEqual(
      expect.arrayContaining([
        { name: 'perPage', required: true },
        { name: 'sortOrder', required: true, options: ['asc', 'desc'] },
        { name: 'internal', required: true, flag: true },
        { name: 'query', required: false },
      ])
    );
  });

  it('reads the query schema of the newest version of a versioned route', () => {
    const route = {
      path: '/foo',
      method: 'get',
      isVersioned: true,
      options: { access: 'public' },
      handlers: [
        {
          options: {
            version: '2023-10-31',
            validate: {
              request: {
                query: schema.object({
                  space: schema.maybe(schema.string()),
                }),
              },
            },
          },
          handler: jest.fn(),
        },
      ],
    } as unknown as VersionedRouterRoute;

    expect(extractRouteQueryParameters(route)).toEqual([{ name: 'space', required: false }]);
  });
});
