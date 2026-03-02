/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseOasdiff } from './parse_oasdiff';
import type { OasdiffEntry } from './parse_oasdiff';

const entry = (overrides: Partial<OasdiffEntry> = {}): OasdiffEntry => ({
  id: 'request-parameter-removed',
  text: 'parameter removed',
  level: 3,
  operation: 'GET',
  path: '/api/test',
  source: 'test',
  ...overrides,
});

describe('parseOasdiff', () => {
  it('returns empty array for empty input', () => {
    expect(parseOasdiff([])).toEqual([]);
  });

  it('maps api-removed-without-deprecation to method_removed', () => {
    const result = parseOasdiff([
      entry({
        id: 'api-removed-without-deprecation',
        text: 'GET /api/test removed',
        operation: 'GET',
        path: '/api/test',
      }),
    ]);
    expect(result).toEqual([
      { type: 'method_removed', path: '/api/test', method: 'GET', reason: 'GET /api/test removed' },
    ]);
  });

  it('maps api-path-removed-without-deprecation to path_removed with method undefined', () => {
    const result = parseOasdiff([
      entry({
        id: 'api-path-removed-without-deprecation',
        text: '/api/spaces/space removed',
        operation: '',
        path: '/api/spaces/space',
      }),
    ]);
    expect(result).toEqual([
      {
        type: 'path_removed',
        path: '/api/spaces/space',
        method: undefined,
        reason: '/api/spaces/space removed',
      },
    ]);
  });

  it('maps api-removed-before-sunset to method_removed', () => {
    const result = parseOasdiff([
      entry({
        id: 'api-removed-before-sunset',
        text: 'DELETE /api/old removed before sunset',
        operation: 'DELETE',
        path: '/api/old',
      }),
    ]);
    expect(result).toEqual([
      {
        type: 'method_removed',
        path: '/api/old',
        method: 'DELETE',
        reason: 'DELETE /api/old removed before sunset',
      },
    ]);
  });

  it('maps other ERR level entries to operation_breaking', () => {
    const result = parseOasdiff([
      entry({
        id: 'request-parameter-removed',
        text: 'parameter removed',
        operation: 'POST',
        path: '/api/test',
      }),
    ]);
    expect(result).toEqual([
      {
        type: 'operation_breaking',
        path: '/api/test',
        method: 'POST',
        reason: 'parameter removed',
      },
    ]);
  });

  it('filters out WARN level entries (level 2)', () => {
    expect(parseOasdiff([entry({ level: 2 })])).toEqual([]);
  });

  it('filters out INFO level entries (level 1)', () => {
    expect(parseOasdiff([entry({ level: 1 })])).toEqual([]);
  });

  it('returns only ERR entries from mixed input', () => {
    const result = parseOasdiff([
      entry({ id: 'api-removed-without-deprecation', level: 3, path: '/api/a' }),
      entry({ id: 'some-warning', level: 2, path: '/api/b' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/api/a');
  });
});
