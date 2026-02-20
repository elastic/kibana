/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseBumpDiff } from './parse_bump_diff';
import type { BumpDiffEntry } from './parse_bump_diff';

describe('parseBumpDiff', () => {
  it('returns empty array for empty input', () => {
    expect(parseBumpDiff([])).toEqual([]);
  });
  // Keep test imput inline for readability
  it('parses a removed endpoint as path_removed', () => {
    const entries: BumpDiffEntry[] = [
      {
        id: '1',
        name: '/api/spaces/space',
        type: 'endpoint',
        status: 'removed',
        breaking: true,
      },
    ];

    const result = parseBumpDiff(entries);
    expect(result).toEqual([
      {
        type: 'path_removed',
        path: '/api/spaces/space',
        method: undefined,
        reason: 'Endpoint removed',
      },
    ]);
  });

  it('parses a removed method as method_removed', () => {
    const entries: BumpDiffEntry[] = [
      {
        id: '1',
        name: 'DELETE /api/spaces/space/{id}',
        type: 'endpoint',
        status: 'removed',
        breaking: true,
      },
    ];

    const result = parseBumpDiff(entries);
    expect(result).toEqual([
      {
        type: 'method_removed',
        path: '/api/spaces/space/{id}',
        method: 'DELETE',
        reason: 'HTTP method removed',
      },
    ]);
  });

  it('parses modified endpoint with breaking children as operation_breaking', () => {
    const entries: BumpDiffEntry[] = [
      {
        id: '1',
        name: 'POST /api/fleet/agent_policies',
        type: 'endpoint',
        status: 'modified',
        children: [
          {
            id: '2',
            name: 'email',
            type: 'parameter',
            status: 'added',
            breaking: true,
            breaking_details: { breaking_attributes: ['required'] },
          },
        ],
      },
    ];

    const result = parseBumpDiff(entries);
    expect(result).toEqual([
      {
        type: 'operation_breaking',
        path: '/api/fleet/agent_policies',
        method: 'POST',
        reason: "parameter 'email' became required",
      },
    ]);
  });

  it('collects multiple breaking reasons from children', () => {
    const entries: BumpDiffEntry[] = [
      {
        id: '1',
        name: 'GET /api/test',
        type: 'endpoint',
        status: 'modified',
        children: [
          {
            id: '2',
            name: 'field_a',
            type: 'property',
            status: 'removed',
            breaking: true,
          },
          {
            id: '3',
            name: 'field_b',
            type: 'parameter',
            status: 'added',
            breaking: true,
            breaking_details: { breaking_attributes: ['required'] },
          },
        ],
      },
    ];

    const result = parseBumpDiff(entries);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toContain("property 'field_a' removed");
    expect(result[0].reason).toContain("parameter 'field_b' became required");
  });

  it('collects breaking reasons from nested children', () => {
    const entries: BumpDiffEntry[] = [
      {
        id: '1',
        name: 'PUT /api/test',
        type: 'endpoint',
        status: 'modified',
        children: [
          {
            id: '2',
            name: 'requestBody',
            type: 'body',
            status: 'modified',
            children: [
              {
                id: '3',
                name: 'nested_field',
                type: 'property',
                status: 'removed',
                breaking: true,
              },
            ],
          },
        ],
      },
    ];

    const result = parseBumpDiff(entries);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toContain("property 'nested_field' removed");
  });

  it('skips non-breaking entries', () => {
    const entries: BumpDiffEntry[] = [
      {
        id: '1',
        name: 'GET /api/new',
        type: 'endpoint',
        status: 'added',
        breaking: false,
      },
      {
        id: '2',
        name: 'GET /api/docs',
        type: 'endpoint',
        status: 'modified',
        children: [
          {
            id: '3',
            name: 'description',
            type: 'property',
            status: 'modified',
            breaking: false,
          },
        ],
      },
    ];

    expect(parseBumpDiff(entries)).toEqual([]);
  });

  it('handles mixed breaking and non-breaking entries', () => {
    const entries: BumpDiffEntry[] = [
      {
        id: '1',
        name: 'DELETE /api/old',
        type: 'endpoint',
        status: 'removed',
        breaking: true,
      },
      {
        id: '2',
        name: 'GET /api/new',
        type: 'endpoint',
        status: 'added',
        breaking: false,
      },
    ];

    const result = parseBumpDiff(entries);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/api/old');
  });

  it('handles all HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

    for (const method of methods) {
      const entries: BumpDiffEntry[] = [
        {
          id: '1',
          name: `${method} /api/test`,
          type: 'endpoint',
          status: 'removed',
          breaking: true,
        },
      ];

      const result = parseBumpDiff(entries);
      expect(result[0].method).toBe(method);
    }
  });

  it('formats generic breaking child status', () => {
    const entries: BumpDiffEntry[] = [
      {
        id: '1',
        name: 'GET /api/test',
        type: 'endpoint',
        status: 'modified',
        children: [
          {
            id: '2',
            name: 'schema',
            type: 'schema',
            status: 'modified',
            breaking: true,
          },
        ],
      },
    ];

    const result = parseBumpDiff(entries);
    expect(result[0].reason).toBe("schema 'schema' modified");
  });
});
