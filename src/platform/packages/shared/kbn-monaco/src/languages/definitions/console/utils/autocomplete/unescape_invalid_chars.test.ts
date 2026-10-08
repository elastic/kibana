/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unescapeInvalidChars } from './unescape_invalid_chars';

describe('unescapeInvalidChars', () => {
  it('should return the original string if there are no escape sequences', () => {
    const input = 'simple string';
    expect(unescapeInvalidChars(input)).toBe('simple string');
  });

  it('should unescape escaped double quotes', () => {
    const input = '\\"hello\\"';
    expect(unescapeInvalidChars(input)).toBe('"hello"');
  });

  it('should unescape escaped backslashes', () => {
    const input = 'path\\\\to\\\\file';
    expect(unescapeInvalidChars(input)).toBe('path\\to\\file');
  });

  it('should unescape both escaped backslashes and quotes', () => {
    const input = 'say: \\"hello\\" and path: C:\\\\Program Files\\\\App';
    expect(unescapeInvalidChars(input)).toBe('say: "hello" and path: C:\\Program Files\\App');
  });

  it('should handle mixed content correctly', () => {
    const input = 'log: \\"User \\\\\\"admin\\\\\\" logged in\\"';
    expect(unescapeInvalidChars(input)).toBe('log: "User \\"admin\\" logged in"');
  });

  it('should leave already unescaped characters alone', () => {
    const input = '"already unescaped" \\ and /';
    expect(unescapeInvalidChars(input)).toBe('"already unescaped" \\ and /');
  });

  it('should not over-unescape multiple backslashes', () => {
    const input = '\\\\\\\\"test\\\\"';
    // \\\\"test\\" becomes \\"test\"
    expect(unescapeInvalidChars(input)).toBe('\\\\"test\\"');
  });
});
