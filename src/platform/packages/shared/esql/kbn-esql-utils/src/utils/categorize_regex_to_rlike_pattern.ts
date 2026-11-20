/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Lucene regexp metacharacters. ES|QL RLIKE matches the whole value and has no lazy quantifiers.
 */
const LUCENE_REGEXP_RESERVED = new Set('.?*+|{}[]()"\\#@&<>~'.split(''));

const escapeLuceneRegexpChar = (char: string): string =>
  LUCENE_REGEXP_RESERVED.has(char) ? `\\${char}` : char;

/**
 * Converts a CATEGORIZE pattern into a Lucene regexp for ES|QL RLIKE.
 * `.*?` and `.+?` are the generated separators. Everything else is literal text, whether
 * CATEGORIZE escaped it or left punctuation such as `1.1` raw.
 * Returns undefined for empty input, a dangling backslash, or a string with no separators.
 */
export const categorizeRegexToRLikePattern = (regexString: string): string | undefined => {
  if (regexString.length === 0) {
    return undefined;
  }

  let sawWildcard = false;
  let pattern = '';

  for (let index = 0; index < regexString.length; ) {
    if (regexString.startsWith('.*?', index)) {
      pattern += '.*';
      sawWildcard = true;
      index += 3;
      continue;
    }

    if (regexString.startsWith('.+?', index)) {
      pattern += '.+';
      sawWildcard = true;
      index += 3;
      continue;
    }

    const char = regexString[index];
    if (char === '\\') {
      const escaped = regexString[index + 1];
      if (escaped === undefined) {
        return undefined;
      }
      pattern += escapeLuceneRegexpChar(escaped);
      index += 2;
      continue;
    }

    pattern += escapeLuceneRegexpChar(char);
    index += 1;
  }

  if (!sawWildcard) {
    return undefined;
  }

  return pattern;
};
