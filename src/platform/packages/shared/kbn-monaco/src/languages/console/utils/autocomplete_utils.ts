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
 * the current position is:
 * - inside a `""" ... """` triple-quoted string
 * - inside the JSON string value for the `"query"` key (either `"..."` or `"""..."""`)
 * - and whether the surrounding request section is a POST /_query(/async) request.
 *
 * When inside an ES|QL query value, it returns the start index of the query text (the first
 * character after the opening quote(s)).
 * @param text The text up to the current position
 */
const TRIPLE_QUOTES = '"""';
const QUERY_KEY = '"query"';
const ESQL_QUERY_REQUEST_LINE_RE = /^post\s+\/?_query(?:\/async)?(?:\s|\?|$)/i;
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'] as const;

const ASCII = {
  A_UPPER: 65,
  Z_UPPER: 90,
  A_LOWER: 97,
  Z_LOWER: 122,
} as const;

const isWhitespace = (ch: string | undefined) =>
  ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';

/**
 * Walks backwards from `fromIndex` until a non-whitespace character is found.
 * Returns that index, or -1 if the scan runs past the beginning.
 */
const skipWhitespaceBackward = (text: string, fromIndex: number): number => {
  for (let index = fromIndex; index >= 0; index--) {
    if (!isWhitespace(text[index])) {
      return index;
    }
  }
  return -1;
};

const isAsciiLetter = (ch: string | undefined): boolean => {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (
    (code >= ASCII.A_UPPER && code <= ASCII.Z_UPPER) ||
    (code >= ASCII.A_LOWER && code <= ASCII.Z_LOWER)
  );
};

/**
 * Returns true when `index` is positioned at the start of a line.
 * In this file we treat `\n` as the line separator (Console input is normalized to `\n`).
 */
const isStartOfLine = (text: string, index: number): boolean => {
  if (index === 0) {
    return true;
  }
  const previousChar = text[index - 1];
  return previousChar === '\n';
};

/**
 * Checks whether `text[quoteIndex]` (the opening quote character of either `"` or `"""`) is the
 * start of the JSON value for the `"query"` key, i.e. the preceding text ends with:
 * `"query"\s*:\s*`.
 *
 * This is intentionally implemented without regexes and without creating large substrings.
 */
const isQueryValueStartAtQuote = (text: string, quoteIndex: number): boolean => {
  // We expect the preceding text to end with: `"query"\s*:\s*`
  const colonIndex = skipWhitespaceBackward(text, quoteIndex - 1);
  if (colonIndex < 0 || text[colonIndex] !== ':') {
    return false;
  }

  const keyEndIndex = skipWhitespaceBackward(text, colonIndex - 1);
  const keyStartIndex = keyEndIndex - (QUERY_KEY.length - 1);
  if (keyStartIndex < 0) {
    return false;
  }
  return text.startsWith(QUERY_KEY, keyStartIndex);
};

/**
 * Case-insensitive word match at `startIndex` for ASCII methods.
 * Ensures we don't accidentally match longer identifiers (e.g. `GETS`).
 */
const matchesWordAt = (text: string, startIndex: number, word: string): boolean => {
  for (let offset = 0; offset < word.length; offset++) {
    const ch = text[startIndex + offset];
    if (!ch || ch.toUpperCase() !== word[offset]) {
      return false;
    }
  }
  // Ensure we don't match a larger identifier (e.g. GETS).
  return !isAsciiLetter(text[startIndex + word.length]);
};

/**
 * Returns true when `text[startIndex...]` starts with an HTTP method token (GET/POST/...)
 * and is not part of a longer word.
 */
const isRequestMethodAt = (text: string, startIndex: number): boolean => {
  if (!isAsciiLetter(text[startIndex])) return false;
  for (const method of HTTP_METHODS) {
    if (matchesWordAt(text, startIndex, method)) {
      return true;
    }
  }
  return false;
};

/**
 * Returns true if the given request line corresponds to an ES|QL request (`POST /_query` or
 * `POST /_query/async`), allowing querystring suffixes.
 */
const isEsqlQueryRequestLine = (line: string): boolean => ESQL_QUERY_REQUEST_LINE_RE.test(line);

/**
 * Returns the index where query text begins if `quoteIndex` starts the `"query"` value.
 * Otherwise returns -1.
 */
const getQueryValueStartIndex = (text: string, quoteIndex: number, quoteLen: 1 | 3): number => {
  return isQueryValueStartAtQuote(text, quoteIndex) ? quoteIndex + quoteLen : -1;
};

/**
 * Attempts to interpret the line starting at `lineStartIndex` as a Console request line
 * (HTTP method + path). When a request line is found, returns:
 * - `isEsqlQueryRequest`: whether this request line is a POST /_query(/async) request
 * - `nextIndex`: where the main scan loop should continue (the beginning of the next line)
 */
const scanRequestLineFrom = (
  text: string,
  lineStartIndex: number
): { nextIndex: number; isEsqlQueryRequest: boolean } | undefined => {
  let scanIndex = lineStartIndex;
  // Skip leading spaces/tabs on the request line.
  while (scanIndex < text.length && (text[scanIndex] === ' ' || text[scanIndex] === '\t')) {
    scanIndex++;
  }

  if (scanIndex >= text.length || !isRequestMethodAt(text, scanIndex)) {
    return;
  }

  const newlineIndex = text.indexOf('\n', scanIndex);
  const lineEnd = newlineIndex === -1 ? text.length : newlineIndex;

  // The request line is typically short; substring allocation here is bounded.
  const line = text.slice(scanIndex, lineEnd);
  const isEsqlQueryRequest = isEsqlQueryRequestLine(line);

  // Move the index past the current request line.
  const nextIndex = newlineIndex === -1 ? text.length : newlineIndex + 1;
  return { nextIndex, isEsqlQueryRequest };
};

export const checkForTripleQuotesAndEsqlQuery = (
  text: string
): {
  insideTripleQuotes: boolean;
  insideEsqlQuery: boolean;
  esqlQueryIndex: number;
} => {
  // Quote tracking for the JSON body:
  // - inDoubleQuoteString: between unescaped `" ... "`
  // - inTripleQuoteString: between `""" ... """` (only toggled when not already in double quotes)
  let inDoubleQuoteString = false;
  let inTripleQuoteString = false;

  // Tracks whether the *current* string (double or triple) is the value for `"query"`.
  let inQueryValueString = false;

  // Tracks whether the current request section is a POST /_query(/async) request.
  let inEsqlQueryRequest = false;

  // Start index of the query text (first character after opening quote(s)) when inQueryValueString=true.
  let esqlQueryStartIndex = -1;

  for (let index = 0; index < text.length; ) {
    // Detect request boundaries (only meaningful outside quoted regions).
    if (!inDoubleQuoteString && !inTripleQuoteString && isStartOfLine(text, index)) {
      const requestLineScan = scanRequestLineFrom(text, index);
      if (requestLineScan) {
        inEsqlQueryRequest = requestLineScan.isEsqlQueryRequest;
        index = requestLineScan.nextIndex;
        continue;
      }
    }

    // Triple quotes (only when we're not already inside a standard JSON string).
    if (!inDoubleQuoteString && text.startsWith(TRIPLE_QUOTES, index)) {
      inTripleQuoteString = !inTripleQuoteString;
      if (inTripleQuoteString) {
        esqlQueryStartIndex = getQueryValueStartIndex(text, index, 3);
        inQueryValueString = esqlQueryStartIndex !== -1;
      } else {
        inQueryValueString = false;
        esqlQueryStartIndex = -1;
      }
      index += 3;
      continue;
    }

    // Standard JSON string quotes (unescaped only, and only when not in triple quotes).
    if (!inTripleQuoteString && text[index] === '"' && text[index - 1] !== '\\') {
      inDoubleQuoteString = !inDoubleQuoteString;
      if (inDoubleQuoteString) {
        esqlQueryStartIndex = getQueryValueStartIndex(text, index, 1);
        inQueryValueString = esqlQueryStartIndex !== -1;
      } else {
        inQueryValueString = false;
        esqlQueryStartIndex = -1;
      }
      index++;
      continue;
    }

    index++;
  }

  return {
    insideTripleQuotes: inTripleQuoteString,
    insideEsqlQuery: inEsqlQueryRequest && inQueryValueString,
    esqlQueryIndex: inEsqlQueryRequest ? esqlQueryStartIndex : -1,
  };
};

/**
 * This function unescapes chars that are invalid in a Console string.
 */
export const unescapeInvalidChars = (str: string): string => {
  return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
};
