/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { charsToPixels } from './truncate';

describe('charsToPixels', () => {
  it('returns undefined when truncate is missing or non-positive', () => {
    expect(charsToPixels(undefined)).toBeUndefined();
    expect(charsToPixels(null)).toBeUndefined();
    expect(charsToPixels(0)).toBeUndefined();
    expect(charsToPixels(-1)).toBeUndefined();
  });

  it('converts character counts to an approximate pixel width', () => {
    expect(charsToPixels(100)).toBe(660);
  });

  it('uses the provided font size', () => {
    expect(charsToPixels(10, 12)).toBe(72);
  });
});
