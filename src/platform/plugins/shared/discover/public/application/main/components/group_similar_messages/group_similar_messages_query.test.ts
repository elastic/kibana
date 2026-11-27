/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMatchingMessagesQuery, groupSimilarMessages } from './group_similar_messages_query';

describe('groupSimilarMessages', () => {
  it('retains the source pipeline and escapes tokens in the matching query', () => {
    const source = 'FROM logs-* | WHERE service.name == "checkout" // selected service';
    const grouped = groupSimilarMessages(source);
    expect(getMatchingMessagesQuery(grouped, 'say "hello"')).toEqual(
      source +
        '\n  | WHERE MATCH(TO_TEXT(TO_STRING(message)), "say \\"hello\\"", {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})'
    );
  });

  it('leaves other pattern queries to the existing cell action', () => {
    expect(
      getMatchingMessagesQuery('FROM logs | STATS BY CATEGORIZE(other)', 'error')
    ).toBeUndefined();
  });
});
