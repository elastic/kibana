/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildEndpointIndex, findEndpointByMethodAndPath, type EndpointIndex } from './indexer';

describe('console_specs/indexer', () => {
  const specs = {
    es: {
      endpoints: {
        search: {
          methods: ['GET', 'POST'],
          patterns: ['_search', '{index}/_search'],
          url_params: { q: '' },
        },
        cat_indices: {
          methods: ['GET'],
          patterns: ['_cat/indices'],
        },
      },
    },
  } as any;

  it('buildEndpointIndex normalizes and maps endpoints', () => {
    const idx = buildEndpointIndex(specs);
    expect(idx.size).toBe(2);
    const search = idx.get('search');
    expect(search).toBeDefined();
    expect(search!.methods).toEqual(['GET', 'POST']);
    // patterns are normalized to start with '/'
    expect(search!.patterns).toEqual(['/_search', '/{index}/_search']);
  });

  it('findEndpointByMethodAndPath matches literal pattern', () => {
    const idx = buildEndpointIndex(specs);
    const res = findEndpointByMethodAndPath(idx, 'GET', '/_cat/indices');
    expect(res.matched).toBe(true);
    expect(res.endpointName).toBe('cat_indices');
  });

  it('findEndpointByMethodAndPath matches placeholder pattern', () => {
    const idx = buildEndpointIndex(specs);
    const res = findEndpointByMethodAndPath(idx, 'POST', '/myindex/_search');
    expect(res.matched).toBe(true);
    expect(res.endpointName).toBe('search');
  });

  it('findEndpointByMethodAndPath respects method filter', () => {
    const idx = buildEndpointIndex(specs);
    const res = findEndpointByMethodAndPath(idx, 'POST', '/_cat/indices');
    expect(res.matched).toBe(false);
  });

  it('returns matched=false for unknown endpoint', () => {
    const idx: EndpointIndex = new Map();
    const res = findEndpointByMethodAndPath(idx, 'GET', '/_unknown');
    expect(res.matched).toBe(false);
  });
});
