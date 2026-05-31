/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RegisteredRouteInfo } from '@kbn/core/server';
import { buildKibanaApiSpec } from './kibana_api_spec';

const route = (overrides: Partial<RegisteredRouteInfo>): RegisteredRouteInfo => ({
  path: '/api/example',
  method: 'get',
  access: 'public',
  isVersioned: false,
  ...overrides,
});

describe('buildKibanaApiSpec', () => {
  it('returns a spec shaped like the Elasticsearch definitions', () => {
    const spec = buildKibanaApiSpec([route({ path: '/api/data_views' })]);

    expect(spec).toEqual({
      name: 'kibana',
      globals: {},
      endpoints: {
        'api/data_views': { patterns: ['api/data_views'], methods: ['GET'] },
      },
    });
  });

  it('strips the leading slash so patterns match Console url tokens', () => {
    const spec = buildKibanaApiSpec([route({ path: '/api/spaces/space/{id}' })]);

    expect(spec.endpoints['api/spaces/space/{id}'].patterns).toEqual(['api/spaces/space/{id}']);
  });

  it('uppercases methods and merges routes that share a path', () => {
    const spec = buildKibanaApiSpec([
      route({ path: '/api/spaces/space', method: 'get' }),
      route({ path: '/api/spaces/space', method: 'post' }),
    ]);

    expect(Object.keys(spec.endpoints)).toEqual(['api/spaces/space']);
    expect(spec.endpoints['api/spaces/space'].methods).toEqual(['GET', 'POST']);
  });

  it('excludes internal routes by default', () => {
    const spec = buildKibanaApiSpec([
      route({ path: '/api/public_route', access: 'public' }),
      route({ path: '/internal/secret_route', access: 'internal' }),
    ]);

    expect(Object.keys(spec.endpoints)).toEqual(['api/public_route']);
  });

  it('includes internal routes when requested', () => {
    const spec = buildKibanaApiSpec(
      [
        route({ path: '/api/public_route', access: 'public' }),
        route({ path: '/internal/secret_route', access: 'internal' }),
      ],
      { includeInternal: true }
    );

    expect(Object.keys(spec.endpoints).sort()).toEqual([
      'api/public_route',
      'internal/secret_route',
    ]);
  });

  it('skips the root path which has no segments to complete', () => {
    const spec = buildKibanaApiSpec([route({ path: '/' })]);

    expect(spec.endpoints).toEqual({});
  });

  it('includes versioned routes', () => {
    const spec = buildKibanaApiSpec([
      route({ path: '/api/versioned', method: 'get', isVersioned: true }),
    ]);

    expect(spec.endpoints['api/versioned']).toEqual({
      patterns: ['api/versioned'],
      methods: ['GET'],
    });
  });

  describe('query parameters', () => {
    it('maps enum, boolean and free-form query params to url_params', () => {
      const spec = buildKibanaApiSpec([
        route({
          path: '/api/synthetics/monitors',
          queryParams: [
            { name: 'sortOrder', required: false, options: ['asc', 'desc'] },
            { name: 'internal', required: false, flag: true },
            { name: 'query', required: false },
          ],
        }),
      ]);

      expect(spec.endpoints['api/synthetics/monitors'].url_params).toEqual({
        sortOrder: ['asc', 'desc'],
        internal: '__flag__',
        query: '',
      });
    });

    it('omits url_params when a route has no query parameters', () => {
      const spec = buildKibanaApiSpec([route({ path: '/api/data_views' })]);

      expect(spec.endpoints['api/data_views']).not.toHaveProperty('url_params');
    });

    it('merges the union of query params across methods sharing a path', () => {
      const spec = buildKibanaApiSpec([
        route({
          path: '/api/spaces/space',
          method: 'get',
          queryParams: [{ name: 'purpose', required: false }],
        }),
        route({
          path: '/api/spaces/space',
          method: 'post',
          queryParams: [{ name: 'overwrite', required: false, flag: true }],
        }),
      ]);

      expect(spec.endpoints['api/spaces/space'].url_params).toEqual({
        purpose: '',
        overwrite: '__flag__',
      });
    });
  });
});
