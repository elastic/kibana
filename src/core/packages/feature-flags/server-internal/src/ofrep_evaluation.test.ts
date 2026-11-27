/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  entityTag,
  ifNoneMatchSatisfied,
  OFREP_BULK_PATH,
  OFREP_PROVIDER_BASE_PATH,
  toBulkResponse,
  toOfrepEvaluations,
} from './ofrep_evaluation';

describe('OFREP evaluation shaping', () => {
  test('the provider base path is the parent of the bulk route', () => {
    expect(OFREP_BULK_PATH.startsWith(OFREP_PROVIDER_BASE_PATH)).toBe(true);
    const evaluated = new URL(
      'ofrep/v1/evaluate/flags',
      `http://kibana${OFREP_PROVIDER_BASE_PATH}`
    );
    expect(evaluated.pathname).toBe(OFREP_BULK_PATH);
  });

  test('omits undefined flags and sorts keys', () => {
    expect(
      toOfrepEvaluations({
        zeta: false,
        alpha: 'on',
        missing: undefined,
        count: 2,
      })
    ).toEqual([
      {
        key: 'alpha',
        value: 'on',
        reason: 'CACHED',
        variant: 'on',
        metadata: {},
      },
      {
        key: 'count',
        value: 2,
        reason: 'CACHED',
        variant: '2',
        metadata: {},
      },
      {
        key: 'zeta',
        value: false,
        reason: 'CACHED',
        variant: 'false',
        metadata: {},
      },
    ]);
  });

  test('bulk response wraps the evaluations', () => {
    expect(toBulkResponse({ 'my.flag': true })).toEqual({
      flags: [
        {
          key: 'my.flag',
          value: true,
          reason: 'CACHED',
          variant: 'true',
          metadata: {},
        },
      ],
      metadata: {},
    });
  });

  test('etag matches a quoted hash and a wildcard', () => {
    const etag = entityTag({ flags: [] });
    expect(etag.startsWith('"')).toBe(true);
    expect(ifNoneMatchSatisfied(undefined, etag)).toBe(false);
    expect(ifNoneMatchSatisfied('"other"', etag)).toBe(false);
    expect(ifNoneMatchSatisfied(etag, etag)).toBe(true);
    expect(ifNoneMatchSatisfied(`W/${etag}`, etag)).toBe(true);
    expect(ifNoneMatchSatisfied(`"stale", ${etag}`, etag)).toBe(true);
    expect(ifNoneMatchSatisfied('*', etag)).toBe(true);
  });
});
