/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildApiDeprecationId } from './api_deprecation_id';

describe('#buildApiDeprecationId', () => {
  it('returns apiDeprecationId string for versioned routes', () => {
    const apiDeprecationId = buildApiDeprecationId({
      routeMethod: 'get',
      routePath: '/api/test',
      routeVersion: '10-10-2023',
    });
    expect(apiDeprecationId).toBe('10-10-2023|get|/api/test');
  });

  it('returns apiDeprecationId string for unversioned routes', () => {
    const apiDeprecationId = buildApiDeprecationId({
      routeMethod: 'get',
      routePath: '/api/test',
    });
    expect(apiDeprecationId).toBe('unversioned|get|/api/test');
  });

  it('gives the same ID the route method is capitalized or not', () => {
    const apiDeprecationId = buildApiDeprecationId({
      // @ts-expect-error
      routeMethod: 'GeT',
      routePath: '/api/test',
      routeVersion: '10-10-2023',
    });

    expect(apiDeprecationId).toBe('10-10-2023|get|/api/test');
  });

  it('gives the same ID the route path has a trailing slash or not', () => {
    const apiDeprecationId = buildApiDeprecationId({
      // @ts-expect-error
      routeMethod: 'GeT',
      routePath: '/api/test/',
      routeVersion: '10-10-2023',
    });

    expect(apiDeprecationId).toBe('10-10-2023|get|/api/test');
  });
});
