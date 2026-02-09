/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { diffOas } from './diff_oas';
import type { OasDiff } from './diff_oas';
import type { NormalizedSpec } from '../input/normalize_oas';

const createNormalizedSpec = (overrides: Partial<NormalizedSpec> = {}): NormalizedSpec => ({
  paths: {},
  ...overrides,
});

const expectEmptyDiff = (diff: OasDiff) => {
  for (const value of Object.values(diff)) {
    expect(value).toEqual([]);
  }
};

describe('diffOas', () => {
  it('detects added paths', () => {
    const baseline = createNormalizedSpec();
    const current = createNormalizedSpec({
      paths: {
        '/api/new': { get: { responses: { '200': {} } } },
      },
    });

    const diff = diffOas(baseline, current);

    expect(diff.pathsAdded).toEqual([{ type: 'added', path: '/api/new' }]);
    expect(diff.pathsRemoved).toEqual([]);
  });

  it('detects removed paths', () => {
    const baseline = createNormalizedSpec({
      paths: {
        '/api/old': { get: { responses: { '200': {} } } },
      },
    });
    const current = createNormalizedSpec();

    const diff = diffOas(baseline, current);

    expect(diff.pathsRemoved).toEqual([{ type: 'removed', path: '/api/old' }]);
    expect(diff.pathsAdded).toEqual([]);
  });

  it('detects added methods', () => {
    const baseline = createNormalizedSpec({
      paths: {
        '/api/test': { get: { responses: { '200': {} } } },
      },
    });
    const current = createNormalizedSpec({
      paths: {
        '/api/test': {
          get: { responses: { '200': {} } },
          post: { responses: { '201': {} } },
        },
      },
    });

    const diff = diffOas(baseline, current);

    expect(diff.methodsAdded).toEqual([{ type: 'added', path: '/api/test', method: 'post' }]);
  });

  it('detects removed methods', () => {
    const baseline = createNormalizedSpec({
      paths: {
        '/api/test': {
          get: { responses: { '200': {} } },
          delete: { responses: { '204': {} } },
        },
      },
    });
    const current = createNormalizedSpec({
      paths: {
        '/api/test': { get: { responses: { '200': {} } } },
      },
    });

    const diff = diffOas(baseline, current);

    expect(diff.methodsRemoved).toEqual([{ type: 'removed', path: '/api/test', method: 'delete' }]);
  });

  it('detects modified operations', () => {
    const baseline = createNormalizedSpec({
      paths: {
        '/api/test': {
          get: {
            parameters: [{ name: 'old' }],
            responses: { '200': {} },
          },
        },
      },
    });
    const current = createNormalizedSpec({
      paths: {
        '/api/test': {
          get: {
            parameters: [{ name: 'new' }],
            responses: { '200': {} },
          },
        },
      },
    });

    const diff = diffOas(baseline, current);

    expect(diff.operationsModified).toHaveLength(1);
    expect(diff.operationsModified[0]).toMatchObject({
      path: '/api/test',
      method: 'get',
      changes: [
        {
          type: 'parameters',
          change: 'modified',
          details: [{ name: 'new' }],
        },
      ],
    });
  });

  it('detects multiple changes in same operation', () => {
    const baseline = createNormalizedSpec({
      paths: {
        '/api/test': {
          post: {
            requestBody: { old: 'body' },
            responses: { '200': { old: 'response' } },
          },
        },
      },
    });
    const current = createNormalizedSpec({
      paths: {
        '/api/test': {
          post: {
            requestBody: { new: 'body' },
            responses: { '200': { new: 'response' } },
          },
        },
      },
    });

    const diff = diffOas(baseline, current);

    expect(diff.operationsModified).toHaveLength(1);
    expect(diff.operationsModified[0].changes).toHaveLength(2);
    expect(diff.operationsModified[0].changes.map((c) => c.type)).toEqual([
      'requestBody',
      'responses',
    ]);
  });

  it('returns empty diff for identical specs', () => {
    const spec = createNormalizedSpec({
      paths: {
        '/api/test': {
          get: {
            parameters: [{ name: 'id' }],
            responses: { '200': {} },
          },
        },
      },
    });

    const diff = diffOas(spec, spec);

    expectEmptyDiff(diff);
  });
});
