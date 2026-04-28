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
      {
        type: 'method_removed',
        path: '/api/test',
        method: 'GET',
        reason: 'GET /api/test removed',
        oasdiffId: 'api-removed-without-deprecation',
        source: 'test',
      },
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
        oasdiffId: 'api-path-removed-without-deprecation',
        source: 'test',
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
        oasdiffId: 'api-removed-before-sunset',
        source: 'test',
      },
    ]);
  });

  it('maps other ERR level entries to operation_breaking', () => {
    const result = parseOasdiff([
      entry({
        id: 'some-unknown-breaking-check',
        text: 'something broke',
        operation: 'POST',
        path: '/api/test',
      }),
    ]);
    expect(result).toEqual([
      {
        type: 'operation_breaking',
        path: '/api/test',
        method: 'POST',
        reason: 'something broke',
        oasdiffId: 'some-unknown-breaking-check',
        source: 'test',
      },
    ]);
  });

  it('maps request-property-removed to request_property_removed', () => {
    const result = parseOasdiff([
      entry({
        id: 'request-property-removed',
        text: 'request property removed',
        operation: 'PUT',
        path: '/api/test',
        source: '/components/schemas/Output/properties/name',
      }),
    ]);
    expect(result).toEqual([
      {
        type: 'request_property_removed',
        path: '/api/test',
        method: 'PUT',
        reason: 'request property removed',
        oasdiffId: 'request-property-removed',
        source: '/components/schemas/Output/properties/name',
      },
    ]);
  });

  it('maps request-parameter-removed to parameter_removed', () => {
    const result = parseOasdiff([
      entry({
        id: 'request-parameter-removed',
        text: 'parameter removed',
        operation: 'GET',
        path: '/api/test',
      }),
    ]);
    expect(result).toEqual([
      {
        type: 'parameter_removed',
        path: '/api/test',
        method: 'GET',
        reason: 'parameter removed',
        oasdiffId: 'request-parameter-removed',
        source: 'test',
      },
    ]);
  });

  it('maps response-required-property-removed to response_property_removed', () => {
    const result = parseOasdiff([
      entry({
        id: 'response-required-property-removed',
        text: 'required response property removed',
        operation: 'GET',
        path: '/api/test',
      }),
    ]);
    expect(result).toEqual([
      {
        type: 'response_property_removed',
        path: '/api/test',
        method: 'GET',
        reason: 'required response property removed',
        oasdiffId: 'response-required-property-removed',
        source: 'test',
      },
    ]);
  });

  it('maps response-optional-property-removed to response_property_removed', () => {
    const result = parseOasdiff([
      entry({
        id: 'response-optional-property-removed',
        text: 'optional response property removed',
        operation: 'GET',
        path: '/api/test',
      }),
    ]);
    expect(result).toEqual([
      {
        type: 'response_property_removed',
        path: '/api/test',
        method: 'GET',
        reason: 'optional response property removed',
        oasdiffId: 'response-optional-property-removed',
        source: 'test',
      },
    ]);
  });

  it('includes promoted warning IDs at level 2', () => {
    const result = parseOasdiff([
      entry({ id: 'request-property-removed', level: 2 }),
      entry({ id: 'request-parameter-removed', level: 2 }),
      entry({ id: 'response-optional-property-removed', level: 2 }),
    ]);
    expect(result).toHaveLength(3);
  });

  it('excludes non-promoted warning IDs at level 2', () => {
    expect(parseOasdiff([entry({ id: 'request-body-all-of-removed', level: 2 })])).toEqual([]);
  });

  it('filters out non-promoted WARN level entries (level 2)', () => {
    expect(parseOasdiff([entry({ id: 'some-warning', level: 2 })])).toEqual([]);
  });

  it('filters out INFO level entries (level 1)', () => {
    expect(parseOasdiff([entry({ id: 'some-info', level: 1 })])).toEqual([]);
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
