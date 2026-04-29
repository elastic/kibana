/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getHighlightRequest } from './highlight_request';

describe('getHighlightRequest', () => {
  test('should be a function', () => {
    expect(getHighlightRequest).toBeInstanceOf(Function);
  });

  test('should return undefined if highlighting is turned off', () => {
    const request = getHighlightRequest(false);
    expect(request).toBe(undefined);
  });
});
