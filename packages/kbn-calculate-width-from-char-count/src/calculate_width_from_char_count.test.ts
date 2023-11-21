/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { calculateWidthFromCharCount } from './calculate_width_from_char_count';

describe('calculateWidthFromCharCount', () => {
  it('should return minimum width if char count is smaller than minWidth', () => {
    expect(calculateWidthFromCharCount(10, { minWidth: 300 })).toBe(300);
  });
  it('should return calculated width', () => {
    expect(calculateWidthFromCharCount(30)).toBe(300 + 2 * 7);
  });
  it('should return maximum width if char count is bigger than maxWidth', () => {
    expect(calculateWidthFromCharCount(1000)).toBe(550);
  });
});
