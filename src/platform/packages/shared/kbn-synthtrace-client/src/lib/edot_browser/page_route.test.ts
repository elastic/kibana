/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inferPageRoute } from './page_route';

describe('inferPageRoute', () => {
  it.each([
    ['/', '/'],
    ['/products/123', '/products/{id}'],
    ['/products/123?ref=ad', '/products/{id}'],
    ['/orders/4f0c7a2e-93b1-4c11-8a35-0e2d9f4b7c10/items/7', '/orders/{id}/items/{id}'],
    ['/files/507f1f77bcf86cd799439011', '/files/{id}'],
    ['/jobs/01ARZ3NDEKTSV4RRFFQ69G5FAV', '/jobs/{id}'],
    ['/articles/2026/10/city-council', '/articles/{id}/{id}/city-council'],
  ])('turns the ID-like segments of %s into {id}', (path, route) => {
    expect(inferPageRoute(path)).toBe(route);
  });

  it('keeps the slugs and words, which look the same as any other text', () => {
    expect(inferPageRoute('/products/trail-running-shoes')).toBe('/products/trail-running-shoes');
    expect(inferPageRoute('/search?q=shoes#results')).toBe('/search');
    expect(inferPageRoute('/deadbeef/cafe')).toBe('/deadbeef/cafe');
  });
});
