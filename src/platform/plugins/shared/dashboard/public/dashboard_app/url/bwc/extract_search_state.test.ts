/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractSearchState } from './extract_search_state';

describe('extractSearchState', () => {
  describe('< 9.2', () => {
    test('should extract timeFrom and timeTo from timeRange', () => {
      const partialState = extractSearchState({
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
      });
      expect(partialState).toEqual({
        timeFrom: 'now-15m',
        timeTo: 'now',
      });
    });
  });
});
