/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeQuery } from '@kbn/as-code-shared-schemas';
import type { Query } from '@kbn/es-query';

import { toAsCodeQuery, toStoredQuery } from './query_transforms';

describe('as-code query transforms', () => {
  test('toStoredQuery returns undefined for undefined', () => {
    expect(toStoredQuery(undefined)).toBeUndefined();
  });

  test('toAsCodeQuery returns undefined for undefined', () => {
    expect(toAsCodeQuery(undefined)).toBeUndefined();
  });

  test('maps as-code kql -> stored kuery', () => {
    const asCodeQuery: AsCodeQuery = { expression: 'foo:bar', language: 'kql' };
    expect(toStoredQuery(asCodeQuery)).toEqual({ query: 'foo:bar', language: 'kuery' });
  });

  test('maps as-code lucene -> stored lucene', () => {
    const asCodeQuery: AsCodeQuery = { expression: 'foo:bar', language: 'lucene' };
    expect(toStoredQuery(asCodeQuery)).toEqual({ query: 'foo:bar', language: 'lucene' });
  });

  test('maps stored kuery -> as-code kql', () => {
    const storedQuery = { query: 'foo:bar', language: 'kuery' } as Query;
    expect(toAsCodeQuery(storedQuery)).toEqual({ expression: 'foo:bar', language: 'kql' });
  });

  test('maps stored lucene -> as-code lucene', () => {
    const storedQuery = { query: 'foo:bar', language: 'lucene' } as Query;
    expect(toAsCodeQuery(storedQuery)).toEqual({ expression: 'foo:bar', language: 'lucene' });
  });

  test('roundtrips a string query', () => {
    const storedQuery = { query: 'foo:bar', language: 'kuery' } as Query;
    const roundTrip = toStoredQuery(toAsCodeQuery(storedQuery));
    expect(roundTrip).toEqual(storedQuery);
  });
});
