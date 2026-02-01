/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This function takes a Console text up to the current position and determines whether
 * the current position is inside triple quotes, triple-quote or single-quote query,
 * and the start index of the current query.
 * @param text The text up to the current position
 */
export const checkForTripleQuotesAndEsqlQuery = (
  text: string
): {
  insideTripleQuotes: boolean;
  insideEsqlQuery: boolean;
  esqlQueryIndex: number;
} => {
  const tripleQuotes = '"""';

  const isWhitespace = (ch: string | undefined) =>
    ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';

  /**
   * Checks whether `text[i]` (the opening quote character of either `"` or `"""`) is the start of
   * the JSON value for the `"query"` key, i.e. the preceding text ends with `"query"\s*:\s*`.
   *
   * This is intentionally implemented without regexes or substring creation in the hot path.
   */
  const isQueryValueStart = (i: number): boolean => {
    let j = i - 1;
    while (j >= 0 && isWhitespace(text[j])) {
      j--;
    }
    if (j < 0 || text[j] !== ':') {
      return false;
    }
    j--;
    while (j >= 0 && isWhitespace(text[j])) {
      j--;
    }
    // We expect the key to end with: "query"
    if (j < 6) {
      return false;
    }
    return text.slice(j - 6, j + 1) === '"query"';
  };

  const isLineStart = (i: number): boolean => i === 0 || text[i - 1] === '\n';

  const isRequestMethodAt = (i: number): boolean => {
    const ch = text[i];
    if (!ch) return false;
    // Fast-path: methods always start with letters. Avoid work for most characters.
    const code = ch.charCodeAt(0);
    const isAlpha = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    if (!isAlpha) return false;

    // Case-insensitive check for supported methods.
    const upper = (idx: number) => (text[idx] ?? '').toUpperCase();
    const matches = (word: string) =>
      word.split('').every((c, k) => upper(i + k) === c) &&
      // ensure we don't match a larger identifier
      !/[A-Z]/i.test(text[i + word.length] ?? '');

    return (
      matches('GET') ||
      matches('POST') ||
      matches('PUT') ||
      matches('DELETE') ||
      matches('HEAD') ||
      matches('PATCH')
    );
  };

  const isEsqlQueryRequestLine = (line: string): boolean => {
    // Mirrors previous behavior:
    // POST <spaces> /?_query(/async)? followed by newline/space/?/end
    return /^post\s+\/?_query(?:\/async)?(?:\s|\?|$)/i.test(line);
  };

  let insideSingleQuotes = false;
  let insideTripleQuotes = false;

  let insideSingleQuotesQuery = false;
  let insideTripleQuotesQuery = false;

  let insideEsqlQueryRequest = false;

  let currentQueryStartIndex = -1;
  let i = 0;

  const updateQueryStateOnQuoteToggle = (
    isNowInsideQuotes: boolean,
    quoteStartIndex: number,
    quoteLen: 1 | 3
  ): boolean => {
    if (isNowInsideQuotes) {
      const isQuery = isQueryValueStart(quoteStartIndex);
      if (isQuery) {
        currentQueryStartIndex = quoteStartIndex + quoteLen;
      }
      return isQuery;
    }

    currentQueryStartIndex = -1;
    return false;
  };

  const scanRequestLineFrom = (lineStartIndex: number): number | undefined => {
    // Skip leading spaces/tabs on the request line.
    let k = lineStartIndex;
    while (k < text.length && (text[k] === ' ' || text[k] === '\t')) {
      k++;
    }

    if (k >= text.length || !isRequestMethodAt(k)) {
      return;
    }

    const newlineIndex = text.indexOf('\n', k);
    const lineEnd = newlineIndex === -1 ? text.length : newlineIndex;
    // The request line is typically short; substring allocation here is bounded.
    const line = text.slice(k, lineEnd);
    insideEsqlQueryRequest = isEsqlQueryRequestLine(line);

    // Move the index past the current request line.
    return newlineIndex === -1 ? text.length : newlineIndex + 1;
  };

  while (i < text.length) {
    // Detect request boundaries (only meaningful outside quoted regions).
    if (!insideSingleQuotes && !insideTripleQuotes && isLineStart(i)) {
      const nextIndex = scanRequestLineFrom(i);
      if (nextIndex !== undefined) {
        i = nextIndex;
        continue;
      }
    }

    if (!insideSingleQuotes && text.startsWith(tripleQuotes, i)) {
      insideTripleQuotes = !insideTripleQuotes;
      insideTripleQuotesQuery = updateQueryStateOnQuoteToggle(insideTripleQuotes, i, 3);
      i += 3; // Skip the triple quotes
      continue;
    }

    if (!insideTripleQuotes && text[i] === '"' && text[i - 1] !== '\\') {
      insideSingleQuotes = !insideSingleQuotes;
      insideSingleQuotesQuery = updateQueryStateOnQuoteToggle(insideSingleQuotes, i, 1);
      i++;
      continue;
    }

    i++;
  }

  return {
    insideTripleQuotes,
    insideEsqlQuery: insideEsqlQueryRequest && (insideSingleQuotesQuery || insideTripleQuotesQuery),
    esqlQueryIndex: insideEsqlQueryRequest ? currentQueryStartIndex : -1,
  };
};

/**
 * This function unescapes chars that are invalid in a Console string.
 */
export const unescapeInvalidChars = (str: string): string => {
  return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
};
