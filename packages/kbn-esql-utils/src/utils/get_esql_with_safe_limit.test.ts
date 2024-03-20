/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getESQLWithSafeLimit } from './get_esql_with_safe_limit';

const LIMIT = 10000;

describe('getESQLWithSafeLimit()', () => {
  it('should not add the limit', () => {
    expect(getESQLWithSafeLimit('show info', LIMIT)).toBe('show info');
    expect(getESQLWithSafeLimit('row t = 5', LIMIT)).toBe('row t = 5');
  });

  it('should add the limit', () => {
    expect(getESQLWithSafeLimit(' from logs', LIMIT)).toBe('from logs | LIMIT 10000');
    expect(getESQLWithSafeLimit('FROM logs* | LIMIT 5', LIMIT)).toBe(
      'FROM logs* | LIMIT 10000| LIMIT 5'
    );
    expect(getESQLWithSafeLimit('FROM logs* | SORT @timestamp | LIMIT 5', LIMIT)).toBe(
      'FROM logs* |SORT @timestamp | LIMIT 10000| LIMIT 5'
    );
    expect(getESQLWithSafeLimit('from logs* | STATS MIN(a) BY b', LIMIT)).toBe(
      'from logs* | LIMIT 10000| STATS MIN(a) BY b'
    );
  });
});
