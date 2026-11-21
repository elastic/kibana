/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, type ParseResult } from '@elastic/esql';
import { LRUCache } from 'lru-cache';

// Retained heap is roughly proportional to query length (~175 bytes per character), so the total
// is bounded by characters, not only by entry count. A query longer than `maxSize` is not cached.
const parseCache = new LRUCache<string, ParseResult>({
  max: 50,
  maxSize: 50_000,
  sizeCalculation: (_result, query) => Math.max(1, query.length),
});

/**
 * Parses an ES|QL query, reusing the shared, read-only result for identical query strings.
 */
export const parseEsqlCached = (query: string): ParseResult => {
  const cached = parseCache.get(query);
  if (cached) {
    return cached;
  }
  const result = Parser.parse(query);
  parseCache.set(query, result);
  return result;
};
