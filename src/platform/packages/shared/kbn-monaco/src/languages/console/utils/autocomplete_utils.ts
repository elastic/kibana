/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Determines whether the cursor position (given by providing the buffer up to the cursor) is
 * currently within an ES|QL `"query"` string for a `POST /_query` request, including triple-quoted
 * strings (`""" ... """`).
 *
 * @param text The Console buffer up to the cursor position.
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

const isStartOfLine = (text: string, index: number): boolean => {
  if (index === 0) {
    return true;
  }
  return text[index - 1] === '\n';
};

const isQueryValueStartAtQuote = (text: string, quoteIndex: number): boolean => {
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

const matchesWordAt = (text: string, startIndex: number, word: string): boolean => {
  for (let offset = 0; offset < word.length; offset++) {
    const ch = text[startIndex + offset];
    if (!ch || ch.toUpperCase() !== word[offset]) {
      return false;
    }
  }
  return !isAsciiLetter(text[startIndex + word.length]);
};

const isRequestMethodAt = (text: string, startIndex: number): boolean => {
  if (!isAsciiLetter(text[startIndex])) return false;
  for (const method of HTTP_METHODS) {
    if (matchesWordAt(text, startIndex, method)) {
      return true;
    }
  }
  return false;
};

const isEsqlQueryRequestLine = (line: string): boolean => ESQL_QUERY_REQUEST_LINE_RE.test(line);

const getQueryValueStartIndex = (text: string, quoteIndex: number, quoteLen: 1 | 3): number => {
  return isQueryValueStartAtQuote(text, quoteIndex) ? quoteIndex + quoteLen : -1;
};

const scanRequestLineFrom = (
  text: string,
  lineStartIndex: number
): { nextIndex: number; isEsqlQueryRequest: boolean } | undefined => {
  let scanIndex = lineStartIndex;
  while (scanIndex < text.length && (text[scanIndex] === ' ' || text[scanIndex] === '\t')) {
    scanIndex++;
  }

  if (scanIndex >= text.length || !isRequestMethodAt(text, scanIndex)) {
    return;
  }

  const newlineIndex = text.indexOf('\n', scanIndex);
  const lineEnd = newlineIndex === -1 ? text.length : newlineIndex;
  const line = text.slice(scanIndex, lineEnd);
  const isEsqlQueryRequest = isEsqlQueryRequestLine(line);

  const nextIndex = newlineIndex === -1 ? text.length : newlineIndex + 1;
  return { nextIndex, isEsqlQueryRequest };
};

export const checkForTripleQuotesAndEsqlQuery = (
  text: string
): { insideTripleQuotes: boolean; insideEsqlQuery: boolean; esqlQueryIndex: number } => {
  let inDoubleQuoteString = false;
  let inTripleQuoteString = false;
  let inQueryValueString = false;

  let inEsqlQueryRequest = false;
  let esqlQueryStartIndex = -1;

  for (let index = 0; index < text.length; ) {
    if (!inDoubleQuoteString && !inTripleQuoteString && isStartOfLine(text, index)) {
      const requestLineScan = scanRequestLineFrom(text, index);
      if (requestLineScan) {
        inEsqlQueryRequest = requestLineScan.isEsqlQueryRequest;
        index = requestLineScan.nextIndex;
        continue;
      }
    }

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
