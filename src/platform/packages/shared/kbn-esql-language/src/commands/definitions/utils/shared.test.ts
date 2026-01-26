/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOverlapRange } from './shared';

describe('getOverlapRange', () => {
  it('should return the overlap range', () => {
    expect(getOverlapRange('IS N', 'IS NOT NULL')).toEqual({ start: 0, end: 4 });
    expect(getOverlapRange('I', 'IS NOT NULL')).toEqual({ start: 0, end: 1 });
    expect(getOverlapRange('j', 'IS NOT NULL')).toBeUndefined();
  });

  it('full query', () => {
    expect(getOverlapRange('FROM index | WHERE field IS N', 'IS NOT NULL')).toEqual({
      start: 25,
      end: 29,
    });
  });
});
