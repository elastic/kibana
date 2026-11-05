/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeSearchQuery } from './normalize_search_query';

describe('normalizeSearchQuery', () => {
  it('removes the escapes and quotes that the search bar adds', () => {
    expect(normalizeSearchQuery('logs\\-app\\-default')).toBe('logs-app-default');
    expect(normalizeSearchQuery('"logs@custom"')).toBe('logs@custom');
  });

  it('trims and lowercases the query', () => {
    expect(normalizeSearchQuery('  Logs-App ')).toBe('logs-app');
  });
});
