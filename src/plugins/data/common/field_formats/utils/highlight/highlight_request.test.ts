/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getHighlightRequest } from './highlight_request';

describe('getHighlightRequest', () => {
  const queryStringQuery = { query_string: { query: 'foo' } };

  test('should be a function', () => {
    expect(getHighlightRequest).toBeInstanceOf(Function);
  });

  test('should not modify the original query', () => {
    getHighlightRequest(queryStringQuery, true);
    expect(queryStringQuery.query_string).not.toHaveProperty('highlight');
  });

  test('should return undefined if highlighting is turned off', () => {
    const request = getHighlightRequest(queryStringQuery, false);
    expect(request).toBe(undefined);
  });
});
