/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isTextBasedQuery } from './is_text_based_query';

describe('isTextBasedQuery', () => {
  it('should work correctly', () => {
    expect(isTextBasedQuery({ query: '', language: 'lucene' })).toEqual(false);
    expect(isTextBasedQuery({ sql: 'SELECT * from foo' })).toEqual(true);
    expect(isTextBasedQuery({ esql: 'from foo' })).toEqual(true);
    expect(isTextBasedQuery()).toEqual(false);
  });
});
