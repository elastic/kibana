/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAsciiLetter } from './chars';
import {
  HTTP_METHODS,
  MAX_REQUEST_LINE_LOOKBACK_CHARS,
  MAX_REQUEST_LINE_LOOKBACK_LINES,
} from './constants';

const ESQL_QUERY_REQUEST_LINE_RE = /^post\s+\/?_query(?:\/async)?(?:\s|\?|$)/i;
const REQUEST_METHOD_LINE_RE = /^\s*(GET|POST|PUT|DELETE|HEAD|PATCH)\b/i;
const REQUEST_LINE_WITH_URL_RE = /^[ \t]*(GET|POST|PUT|DELETE|HEAD|PATCH)[ \t]+\S/i;

const isRequestMethodLine = (line: string): boolean => REQUEST_METHOD_LINE_RE.test(line);
export const isRequestLineWithUrl = (line: string): boolean => REQUEST_LINE_WITH_URL_RE.test(line);

/**
 * Case-insensitive word match at `startIndex` for ASCII methods.
 * Ensures we don't accidentally match longer identifiers (e.g. `GETS`).
 */
const matchesWordAt = (text: string, startIndex: number, word: string): boolean => {
  const matchesEveryChar = [...word].every(
    (wordChar, offset) => text[startIndex + offset]?.toUpperCase() === wordChar
  );
  // Ensure we don't match a larger identifier (e.g. GETS).
  return matchesEveryChar && !isAsciiLetter(text[startIndex + word.length]);
};

/**
 * Returns true when `text[startIndex...]` starts with an HTTP method token (GET/POST/...)
 * and is not part of a longer word.
 */
const isRequestMethodAt = (text: string, startIndex: number): boolean =>
  isAsciiLetter(text[startIndex]) &&
  HTTP_METHODS.some((method) => matchesWordAt(text, startIndex, method));

/**
 * Returns true if the given request line corresponds to an ES|QL request (`POST /_query` or
 * `POST /_query/async`), allowing querystring suffixes.
 */
const isEsqlQueryRequestLine = (line: string): boolean => ESQL_QUERY_REQUEST_LINE_RE.test(line);

/**
 * Attempts to interpret the line starting at `lineStartIndex` as a Console request line
 * (HTTP method + path). When a request line is found, returns:
 * - `isEsqlQueryRequest`: whether this request line is a POST /_query(/async) request
 * - `nextIndex`: where the main scan loop should continue (the beginning of the next line)
 */
export const scanRequestLineFrom = (
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

/**
 * Scans backwards from `positionLineNumber` for a request method line
 * (`GET`/`POST`/...), returning its line number. The default returns the nearest match.
 * The `document` direction returns the range start only after the whole requested range is scanned
 * and a request line is found, so classifiers receive context around untrusted request-like text.
 *
 * Returns `undefined` when no request line is found within the lookback safeguards, so callers
 * can fall back instead of acting on a partially scanned buffer.
 */
export const findRequestLineNumber = (
  getLineContent: (lineNumber: number) => string,
  positionLineNumber: number,
  {
    direction = 'nearest',
    rangeStartLineNumber = 1,
  }: {
    direction?: 'nearest' | 'document';
    rangeStartLineNumber?: number;
  } = {}
): number | undefined => {
  // Precomputing a capped index array keeps the backward walk stack-flat (deep documents
  // overflow recursive walks) and bounds the allocation to the line cap.
  const lineNumbersUpwards = Array.from(
    {
      length: Math.max(
        0,
        Math.min(positionLineNumber - rangeStartLineNumber + 1, MAX_REQUEST_LINE_LOOKBACK_LINES)
      ),
    },
    (_, step) => positionLineNumber - step
  );

  let remainingChars = MAX_REQUEST_LINE_LOOKBACK_CHARS;
  let foundRequestLine = false;
  let lowestScannedLineNumber = positionLineNumber + 1;

  for (const lineNumber of lineNumbersUpwards) {
    const line = getLineContent(lineNumber);
    remainingChars -= line.length + 1;
    if (remainingChars < 0) {
      // Budget exhausted on a partially scanned range: never act on it.
      return undefined;
    }
    if (isRequestMethodLine(line)) {
      if (direction === 'nearest') {
        return lineNumber;
      }
      foundRequestLine = true;
    }
    lowestScannedLineNumber = lineNumber;
  }

  // Only a fully scanned range may be trusted in `document` mode.
  const scannedWholeRange = lowestScannedLineNumber === rangeStartLineNumber;
  return direction === 'document' && scannedWholeRange && foundRequestLine
    ? rangeStartLineNumber
    : undefined;
};
