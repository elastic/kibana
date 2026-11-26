/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Tried in order for character classes, so samples read as plain words and numbers.
const CANDIDATES = [
  ...'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-_. ',
  ...Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)),
];

const ESCAPES: Readonly<Record<string, string>> = {
  d: '0',
  D: 'a',
  w: 'a',
  W: '-',
  s: ' ',
  S: 'a',
  n: '\n',
  r: '\r',
  t: '\t',
  b: '',
  B: '',
};

class Unsupported extends Error {}

const firstMatching = (source: string): string => {
  const matcher = new RegExp(`^${source}$`, 'u');
  const match = CANDIDATES.find((candidate) => matcher.test(candidate));
  if (match === undefined) {
    throw new Unsupported(source);
  }
  return match;
};

/**
 * Generates the shortest string the parsed part of a pattern accepts: the first alternative of
 * each disjunction, the minimum count of each quantifier and the first character of each class.
 */
const createParser = (pattern: string) => {
  let index = 0;
  const peek = () => pattern[index];
  const take = () => pattern[index++];
  const expect = (char: string) => {
    if (take() !== char) {
      throw new Unsupported(pattern);
    }
  };

  const readUntil = (end: string): string => {
    const start = index;
    while (index < pattern.length && peek() !== end) {
      index += peek() === '\\' ? 2 : 1;
    }
    expect(end);
    return pattern.slice(start, index - 1);
  };

  const escape = (): string => {
    const char = take();
    if (char in ESCAPES) {
      return ESCAPES[char];
    }
    if (char === 'p' || char === 'P') {
      expect('{');
      return firstMatching(`\\${char}{${readUntil('}')}}`);
    }
    if (char === 'u' || char === 'x') {
      if (peek() === '{') {
        take();
        return String.fromCodePoint(parseInt(readUntil('}'), 16));
      }
      const length = char === 'u' ? 4 : 2;
      index += length;
      return String.fromCodePoint(parseInt(pattern.slice(index - length, index), 16));
    }
    if (/\d/.test(char)) {
      throw new Unsupported(pattern);
    }
    return char;
  };

  const quantifier = (): number => {
    const char = peek();
    let count = 1;
    if (char === '*' || char === '?') {
      count = 0;
      take();
    } else if (char === '+') {
      take();
    } else if (char === '{' && /^\{\d+(,\d*)?\}/.test(pattern.slice(index))) {
      take();
      count = Number(readUntil('}').split(',')[0]);
    } else {
      return 1;
    }
    if (peek() === '?') {
      take();
    }
    return count;
  };

  const atom = (): string => {
    const char = take();
    switch (char) {
      case '^':
      case '$':
        return '';
      case '.':
        return 'a';
      case '\\':
        return escape();
      case '[':
        return firstMatching(`[${readUntil(']')}]`);
      case '(': {
        if (peek() === '?') {
          take();
          const kind = take();
          if (
            kind === '=' ||
            kind === '!' ||
            (kind === '<' && (peek() === '=' || peek() === '!'))
          ) {
            if (kind === '<') {
              take();
            }
            disjunction();
            expect(')');
            return '';
          }
          if (kind === '<') {
            readUntil('>');
          } else if (kind !== ':') {
            throw new Unsupported(pattern);
          }
        }
        const group = disjunction();
        expect(')');
        return group;
      }
      default:
        return char;
    }
  };

  const alternative = (): string => {
    let result = '';
    while (index < pattern.length && peek() !== '|' && peek() !== ')') {
      const value = atom();
      result += value.repeat(quantifier());
    }
    return result;
  };

  function disjunction(): string {
    const first = alternative();
    while (peek() === '|') {
      take();
      alternative();
    }
    return first;
  }

  return () => {
    const result = disjunction();
    if (index < pattern.length) {
      throw new Unsupported(pattern);
    }
    return result;
  };
};

/**
 * Returns a short string that matches a JSON Schema `pattern`, or undefined when the pattern
 * uses constructs this generator doesn't cover. Patterns are unanchored, so the result is
 * checked against the pattern as written.
 */
export const samplePattern = (pattern: string): string | undefined => {
  try {
    const value = createParser(pattern)();
    return new RegExp(pattern, 'u').test(value) ? value : undefined;
  } catch {
    return undefined;
  }
};
