/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeOas } from './normalize_oas';
import type { OpenAPISpec } from './load_oas';

describe('normalizeOas', () => {
  it('extracts paths with operations', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/api/test': {
          get: {
            summary: 'Get test',
            parameters: [{ name: 'id', in: 'query' }],
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    };

    const normalized = normalizeOas(spec);

    expect(normalized.paths['/api/test'].get).toEqual({
      parameters: [{ name: 'id', in: 'query' }],
      responses: { '200': { description: 'OK' } },
    });
  });

  it('includes requestBody when present', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/api/test': {
          post: {
            requestBody: {
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            responses: { '201': { description: 'Created' } },
          },
        },
      },
    };

    const normalized = normalizeOas(spec);

    expect(normalized.paths['/api/test'].post.requestBody).toEqual({
      content: { 'application/json': { schema: { type: 'object' } } },
    });
  });

  it('sorts paths alphabetically', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/api/zebra': { get: { responses: { '200': {} } } },
        '/api/alpha': { get: { responses: { '200': {} } } },
        '/api/middle': { get: { responses: { '200': {} } } },
      },
    };

    const normalized = normalizeOas(spec);
    const pathKeys = Object.keys(normalized.paths);

    expect(pathKeys).toEqual(['/api/alpha', '/api/middle', '/api/zebra']);
  });

  it('produces stable output regardless of input order', () => {
    const spec1: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/z': { get: { responses: { '200': {} } } },
        '/a': { post: { responses: { '201': {} } } },
      },
    };

    const spec2: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/a': { post: { responses: { '201': {} } } },
        '/z': { get: { responses: { '200': {} } } },
      },
    };

    const normalized1 = normalizeOas(spec1);
    const normalized2 = normalizeOas(spec2);

    expect(normalized1).toEqual(normalized2);
    expect(JSON.stringify(normalized1)).toEqual(JSON.stringify(normalized2));
  });

  it('handles specs with no paths', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
    };

    const normalized = normalizeOas(spec);

    expect(normalized).toEqual({ paths: {} });
  });

  it('skips invalid path items', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/valid': { get: { responses: { '200': {} } } },
        '/invalid': null as any,
      },
    };

    const normalized = normalizeOas(spec);

    expect(Object.keys(normalized.paths)).toEqual(['/valid']);
  });
});
