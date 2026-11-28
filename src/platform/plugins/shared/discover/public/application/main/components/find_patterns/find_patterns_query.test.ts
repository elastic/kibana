/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMatchingMessagesQuery, findPatterns } from './find_patterns_query';

describe('findPatterns', () => {
  it('filters the original pipeline by the ordered category regex', () => {
    const source = 'FROM logs-* | LIMIT 10 // selected sample';
    const grouped = findPatterns(source, 'log text');
    expect(getMatchingMessagesQuery(grouped, 'log text', '.*?payment.+?failed.*?')).toBe(
      source + '\n  | WHERE `log text` RLIKE ".*payment.+failed.*"'
    );
  });

  it('preserves literal regex characters and escapes Lucene and ES|QL special characters', () => {
    const source = 'FROM logs';
    const grouped = findPatterns(source, 'message');
    const pattern = String.raw`.*?service\.name.+?@"host".*?`;
    expect(getMatchingMessagesQuery(grouped, 'message', pattern)).toBe(
      source + '\n' + String.raw`  | WHERE message RLIKE ".*service\\.name.+\\@\\\"host\\\".*"`
    );
  });

  it('leaves other pattern queries to the existing cell action', () => {
    expect(
      getMatchingMessagesQuery('FROM logs | STATS BY CATEGORIZE(other)', 'other', 'error')
    ).toBeUndefined();
  });
});
