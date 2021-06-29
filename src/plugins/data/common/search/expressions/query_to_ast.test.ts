/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { queryToAst } from './query_to_ast';

describe('queryToAst', () => {
  it('returns an object with the correct structure for lucene queies', () => {
    const actual = queryToAst({ language: 'lucene', query: { country: 'US' } });
    expect(actual).toHaveProperty('functions');
    expect(actual.functions[0]).toHaveProperty('name', 'lucene');
    expect(actual.functions[0]).toHaveProperty('arguments', {
      q: ['{"country":"US"}'],
    });
  });

  it('returns an object with the correct structure for kql queies', () => {
    const actual = queryToAst({ language: 'kuery', query: 'country:US' });
    expect(actual).toHaveProperty('functions');
    expect(actual.functions[0]).toHaveProperty('name', 'kql');
    expect(actual.functions[0]).toHaveProperty('arguments', {
      q: ['country:US'],
    });
  });
});
