/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAsciiLetter, isEscaped, isStartOfLine, skipWhitespaceBackward } from './chars';

describe('chars', () => {
  describe('isAsciiLetter', () => {
    it.each(['a', 'z', 'A', 'Z'])('returns true for %s', (ch) => {
      expect(isAsciiLetter(ch)).toBe(true);
    });

    it.each(['0', '_', ' ', 'é', undefined])('returns false for %s', (ch) => {
      expect(isAsciiLetter(ch)).toBe(false);
    });
  });

  describe('isStartOfLine', () => {
    it('returns true at index 0', () => {
      expect(isStartOfLine('abc', 0)).toBe(true);
    });

    it('returns true right after a newline', () => {
      expect(isStartOfLine('a\nb', 2)).toBe(true);
    });

    it('returns false mid-line', () => {
      expect(isStartOfLine('abc', 1)).toBe(false);
    });
  });

  describe('isEscaped', () => {
    it('returns true after a single backslash', () => {
      expect(isEscaped('\\"', 1)).toBe(true);
    });

    it('returns false after an even number of backslashes', () => {
      expect(isEscaped('\\\\"', 2)).toBe(false);
    });

    it('returns true after an odd number of backslashes', () => {
      expect(isEscaped('\\\\\\"', 3)).toBe(true);
    });

    it('returns false with no preceding backslash', () => {
      expect(isEscaped('a"', 1)).toBe(false);
    });
  });

  describe('skipWhitespaceBackward', () => {
    it('returns the index of the nearest non-whitespace character', () => {
      expect(skipWhitespaceBackward('a:  ', 3)).toBe(1);
    });

    it('returns the given index when it is not whitespace', () => {
      expect(skipWhitespaceBackward('ab', 1)).toBe(1);
    });

    it('returns -1 when only whitespace precedes', () => {
      expect(skipWhitespaceBackward('  \t\n', 3)).toBe(-1);
    });
  });
});
