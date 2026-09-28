/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertQueryToESQLExpression } from './convert_query_to_esql';

describe('convertQueryToESQLExpression', () => {
  it('translates a kuery query into a KQL(...) expression', () => {
    expect(convertQueryToESQLExpression({ language: 'kuery', query: 'host.name : "web-1"' })).toBe(
      'KQL("""host.name : "web-1"""")'
    );
  });

  it('translates a lucene query into a QSTR(...) expression and escapes quotes', () => {
    expect(convertQueryToESQLExpression({ language: 'lucene', query: 'host:"web-1"' })).toBe(
      'QSTR("""host:\\"web-1\\"""")'
    );
  });

  it('returns an empty string for an empty query body', () => {
    expect(convertQueryToESQLExpression({ language: 'kuery', query: '' })).toBe('');
  });

  it('returns an empty string for an unsupported language', () => {
    expect(convertQueryToESQLExpression({ language: 'esql' as 'kuery', query: 'FROM logs' })).toBe(
      ''
    );
  });

  it('returns an empty string for an undefined query', () => {
    expect(convertQueryToESQLExpression(undefined)).toBe('');
  });
});
