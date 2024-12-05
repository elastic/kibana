/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { queryToAst } from './query_to_ast';

describe('queryToAst', () => {
  it('returns an object with the correct structure for lucene queies', () => {
    const actual = queryToAst({ language: 'lucene', query: { country: 'US' } });

    expect(actual).toHaveProperty('chain.0.function', 'lucene');
    expect(actual).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({ q: ['{"country":"US"}'] })
    );
  });

  it('returns an object with the correct structure for kql queies', () => {
    const actual = queryToAst({ language: 'kuery', query: 'country:US' });

    expect(actual).toHaveProperty('chain.0.function', 'kql');
    expect(actual).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({ q: ['country:US'] })
    );
  });
});
