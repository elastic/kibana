/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { queryCannotBeSampled } from './query_cannot_be_sampled';
describe('queryCannotBeSampled', () => {
  it('should return true if query contains "match" function', () => {
    expect(queryCannotBeSampled({ esql: 'FROM index | where match(field, "value")' })).toBe(true);
    expect(queryCannotBeSampled({ esql: 'FROM index | where match()' })).toBe(true);
    expect(queryCannotBeSampled({ esql: 'FROM index | where MATCH()' })).toBe(true);
    expect(queryCannotBeSampled({ esql: 'FROM index | where MATCH(fieldName,)' })).toBe(true);
    expect(queryCannotBeSampled({ esql: 'FROM index | where MATCH(,)' })).toBe(true);
  });

  it('should return true if query contains "qstr" function', () => {
    expect(queryCannotBeSampled({ esql: 'FROM index | where qstr(field, "value")' })).toBe(true);
    expect(queryCannotBeSampled({ esql: 'FROM index | where qstr()' })).toBe(true);
    expect(queryCannotBeSampled({ esql: 'FROM index | where QSTR()' })).toBe(true);
  });

  it('should return false if query contains names', () => {
    expect(queryCannotBeSampled({ esql: 'FROM index | eval match =' })).toBe(false);
    expect(queryCannotBeSampled({ esql: 'FROM index | eval MATCH =' })).toBe(false);
    expect(queryCannotBeSampled({ esql: 'FROM index | eval qstr =' })).toBe(false);
  });

  it('should return false if query does not contain unsamplable functions', () => {
    expect(queryCannotBeSampled({ esql: 'FROM index | eval otherFunction(field, "value")' })).toBe(
      false
    );
    expect(queryCannotBeSampled({ esql: 'FROM index | where otherFunction(field, "value")' })).toBe(
      false
    );
  });

  it('should return false if query is undefined', () => {
    expect(queryCannotBeSampled(undefined)).toBe(false);
    expect(queryCannotBeSampled(null)).toBe(false);
  });
});
