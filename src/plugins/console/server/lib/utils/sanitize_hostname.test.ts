/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sanitizeHostname } from './sanitize_hostname';

describe('sanitizeHostname', () => {
  it('should remove leading and trailing brackets', () => {
    expect(sanitizeHostname('[::1]')).toBe('::1');
  });

  it('should remove leading brackets', () => {
    expect(sanitizeHostname('[::1')).toBe('::1');
  });

  it('should remove trailing brackets', () => {
    expect(sanitizeHostname('::1]')).toBe('::1');
  });

  it('should not remove brackets in the middle of the string', () => {
    expect(sanitizeHostname('[::1]foo')).toBe('::1]foo');
  });
});
