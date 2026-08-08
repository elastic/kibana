/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../monaco_imports';
import type { ParsedRequest } from '../types';

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
const MAX_REQUEST_LINE_LOOKBACK_LINES = 2000;
const MAX_REQUEST_LINE_LOOKBACK_CHARS = 100_000;

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

const isEscaped = (text: string, index: number): boolean => {
  let precedingBackslashes = 0;
  for (let previousIndex = index - 1; text[previousIndex] === '\\'; previousIndex--) {
    precedingBackslashes++;
  }
  return precedingBackslashes % 2 === 1;
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

const analyzeTripleQuotesAndEsqlQuery = (
  text: string,
  { trackJsonValue = false }: { trackJsonValue?: boolean } = {}
): {
  insideTripleQuotes: boolean;
  insideEsqlQuery: boolean;
  esqlQueryIndex: number;
  insideTripleQuotedJsonValue: boolean;
} => {
  // Quote tracking for the JSON body:
  // - inDoubleQuoteString: between unescaped `" ... "`
  // - inTripleQuoteString: between `""" ... """` (only toggled when not already in double quotes)
  let inDoubleQuoteString = false;
  let inTripleQuoteString = false;
  let tripleQuoteIsJsonValue = false;
  const jsonContainers: Array<'object' | 'array'> | undefined = trackJsonValue ? [] : undefined;
  let lastSignificantJsonChar: string | undefined;

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
        if (jsonContainers) {
          jsonContainers.length = 0;
          lastSignificantJsonChar = undefined;
        }
        index = requestLineScan.nextIndex;
        continue;
      }
    }

    // Console comments can contain quote-like text that must not affect string state.
    if (!inDoubleQuoteString && !inTripleQuoteString) {
      const currentChar = text[index];
      if (currentChar === '#') {
        const newlineIndex = text.indexOf('\n', index);
        index = newlineIndex === -1 ? text.length : newlineIndex + 1;
        continue;
      }
      if (currentChar === '/') {
        if (text[index + 1] === '/') {
          const newlineIndex = text.indexOf('\n', index);
          index = newlineIndex === -1 ? text.length : newlineIndex + 1;
          continue;
        }
        if (text[index + 1] === '*') {
          const commentEndIndex = text.indexOf('*/', index + 2);
          index = commentEndIndex === -1 ? text.length : commentEndIndex + 2;
          continue;
        }
      }
    }

    // Triple quotes (only when we're not already inside a standard JSON string).
    if (!inDoubleQuoteString && text.startsWith(TRIPLE_QUOTES, index)) {
      inTripleQuoteString = !inTripleQuoteString;
      if (inTripleQuoteString) {
        if (jsonContainers) {
          tripleQuoteIsJsonValue =
            (jsonContainers.at(-1) === 'object' && lastSignificantJsonChar === ':') ||
            (jsonContainers.at(-1) === 'array' &&
              (lastSignificantJsonChar === '[' || lastSignificantJsonChar === ','));
        }
        esqlQueryStartIndex = getQueryValueStartIndex(text, index, 3);
        inQueryValueString = esqlQueryStartIndex !== -1;
      } else {
        if (jsonContainers) {
          lastSignificantJsonChar = '"';
        }
        inQueryValueString = false;
        esqlQueryStartIndex = -1;
      }
      index += 3;
      continue;
    }

    // Standard JSON string quotes (unescaped only, and only when not in triple quotes).
    if (!inTripleQuoteString && text[index] === '"' && !isEscaped(text, index)) {
      inDoubleQuoteString = !inDoubleQuoteString;
      if (inDoubleQuoteString) {
        esqlQueryStartIndex = getQueryValueStartIndex(text, index, 1);
        inQueryValueString = esqlQueryStartIndex !== -1;
      } else {
        if (jsonContainers) {
          lastSignificantJsonChar = '"';
        }
        inQueryValueString = false;
        esqlQueryStartIndex = -1;
      }
      index++;
      continue;
    }

    if (jsonContainers && !inDoubleQuoteString && !inTripleQuoteString) {
      if (text[index] === '{') {
        jsonContainers.push('object');
      } else if (text[index] === '[') {
        jsonContainers.push('array');
      } else if (text[index] === '}' || text[index] === ']') {
        jsonContainers.pop();
      }
      if (!isWhitespace(text[index])) {
        lastSignificantJsonChar = text[index];
      }
    }

    index++;
  }

  return {
    insideTripleQuotes: inTripleQuoteString,
    insideEsqlQuery: inEsqlQueryRequest && inQueryValueString,
    esqlQueryIndex: inEsqlQueryRequest ? esqlQueryStartIndex : -1,
    insideTripleQuotedJsonValue:
      jsonContainers !== undefined && inTripleQuoteString && tripleQuoteIsJsonValue,
  };
};

export const checkForTripleQuotesAndEsqlQuery = (
  text: string
): {
  insideTripleQuotes: boolean;
  insideEsqlQuery: boolean;
  esqlQueryIndex: number;
} => {
  const { insideTripleQuotedJsonValue, ...result } = analyzeTripleQuotesAndEsqlQuery(text);
  return result;
};

export const isInsideTripleQuotedJsonValue = (text: string): boolean =>
  text.length <= MAX_REQUEST_LINE_LOOKBACK_CHARS &&
  analyzeTripleQuotesAndEsqlQuery(text, { trackJsonValue: true }).insideTripleQuotedJsonValue;

/**
 * Safeguards for request-line lookup. We scan backwards from the cursor until we find the nearest
 * request method line (GET/POST/...), but we cap the amount of work to avoid a potentially large
 * number of `getLineContent()` calls on very long documents.
 *
 * The character cap is not redundant with the line cap: pasted JSON with huge string fields can
 * hold millions of characters in only a handful of lines, and callers scan the text we return
 * character by character (see https://github.com/elastic/kibana/pull/251173).
 */
const REQUEST_METHOD_LINE_RE = /^\s*(GET|POST|PUT|DELETE|HEAD|PATCH)\b/i;
const REQUEST_LINE_WITH_URL_RE = /^[ \t]*(GET|POST|PUT|DELETE|HEAD|PATCH)[ \t]+\S/i;

const isRequestMethodLine = (line: string): boolean => REQUEST_METHOD_LINE_RE.test(line);
export const isRequestLineWithUrl = (line: string): boolean => REQUEST_LINE_WITH_URL_RE.test(line);

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
  let foundRequestLine = false;
  let lineNumber = positionLineNumber;
  let scannedLines = 0;
  let scannedChars = 0;
  for (
    ;
    lineNumber >= rangeStartLineNumber &&
    scannedLines < MAX_REQUEST_LINE_LOOKBACK_LINES &&
    scannedChars < MAX_REQUEST_LINE_LOOKBACK_CHARS;
    lineNumber--, scannedLines++
  ) {
    const line = getLineContent(lineNumber);
    scannedChars += line.length + 1;
    if (scannedChars > MAX_REQUEST_LINE_LOOKBACK_CHARS) {
      return undefined;
    }
    if (isRequestMethodLine(line)) {
      if (direction === 'nearest') {
        return lineNumber;
      }
      foundRequestLine = true;
    }
  }

  return direction === 'document' && lineNumber < rangeStartLineNumber && foundRequestLine
    ? rangeStartLineNumber
    : undefined;
};

/**
 * This function unescapes chars that are invalid in a Console string.
 */
export const unescapeInvalidChars = (str: string): string => {
  return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
};

const getRangeText = (
  model: monaco.editor.ITextModel,
  start: monaco.IPosition,
  end: monaco.IPosition
): string =>
  model.getValueInRange({
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  });

/** Index of the last request whose `startOffset` is at or before `offset` (requests are sorted). */
const findLastRequestIndexAtOrBefore = (
  requests: ParsedRequest[],
  offset: number,
  lowerIndex = 0,
  upperIndex = requests.length - 1,
  bestIndex = -1
): number => {
  if (lowerIndex > upperIndex) {
    return bestIndex;
  }
  const middleIndex = Math.floor((lowerIndex + upperIndex) / 2);
  return requests[middleIndex].startOffset <= offset
    ? findLastRequestIndexAtOrBefore(requests, offset, middleIndex + 1, upperIndex, middleIndex)
    : findLastRequestIndexAtOrBefore(requests, offset, lowerIndex, middleIndex - 1, bestIndex);
};

/**
 * A request that begins mid-line right where the previous request ends is a parser recovery
 * artifact of malformed input (e.g. `{"x"} POST _query`), not a real anchor.
 */
const isSameLineRecoveryArtifact = (
  model: monaco.editor.ITextModel,
  startPosition: monaco.IPosition,
  previousRequest: ParsedRequest | undefined
): boolean =>
  startPosition.column > 1 &&
  previousRequest !== undefined &&
  model.getPositionAt(previousRequest.endOffset ?? previousRequest.startOffset).lineNumber ===
    startPosition.lineNumber;

/** Indexes from `fromIndex` down towards 0, at most `limit` of them. */
const backwardIndexesFrom = (fromIndex: number, limit: number): number[] =>
  Array.from(
    { length: Math.max(0, Math.min(fromIndex + 1, limit)) },
    (_, step) => fromIndex - step
  );

/**
 * Walks the parsed requests backwards from the cursor and returns the start position of the
 * request the cursor most plausibly belongs to. When an earlier request's content shows that a
 * later "request" is really text inside its triple-quoted JSON value, that earlier request wins,
 * so parser recovery artifacts inside strings never become anchors. All model reads are capped.
 */
export const getFallbackRequestStartPosition = (
  parsedRequests: ParsedRequest[],
  model: monaco.editor.ITextModel,
  positionLineNumber: number,
  positionColumn = model.getLineContent(positionLineNumber).length + 1
): monaco.IPosition | undefined => {
  const positionOffset = model.getOffsetAt({
    lineNumber: positionLineNumber,
    column: positionColumn,
  });
  const lastRequestIndex = findLastRequestIndexAtOrBefore(parsedRequests, positionOffset);

  let remainingChars = MAX_REQUEST_LINE_LOOKBACK_CHARS;
  let fallback: monaco.IPosition | undefined;

  for (const index of backwardIndexesFrom(lastRequestIndex, MAX_REQUEST_LINE_LOOKBACK_LINES)) {
    const request = parsedRequests[index];
    const startPosition = model.getPositionAt(request.startOffset);
    if (startPosition.lineNumber > positionLineNumber) {
      continue;
    }
    if (isSameLineRecoveryArtifact(model, startPosition, parsedRequests[index - 1])) {
      continue;
    }

    const line = model.getLineContent(startPosition.lineNumber).slice(startPosition.column - 1);
    remainingChars -= line.length + 1;
    if (remainingChars < 0) {
      break;
    }
    if (!isRequestLineWithUrl(line)) {
      continue;
    }
    if (positionOffset - request.startOffset > MAX_REQUEST_LINE_LOOKBACK_CHARS) {
      break;
    }
    if (request.endOffset === undefined) {
      fallback ??= startPosition;
      continue;
    }

    const requestEndOffset = Math.min(request.endOffset + 1, positionOffset);
    remainingChars -= requestEndOffset - request.startOffset;
    if (remainingChars < 0) {
      break;
    }
    fallback ??= startPosition;
    const requestContent = getRangeText(
      model,
      startPosition,
      model.getPositionAt(requestEndOffset)
    );
    if (isInsideTripleQuotedJsonValue(requestContent)) {
      return startPosition;
    }
  }
  return fallback;
};
