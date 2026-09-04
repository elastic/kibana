/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEscaped, isStartOfLine, isWhitespace, skipWhitespaceBackward } from './chars';
import { MAX_REQUEST_LINE_LOOKBACK_CHARS } from './constants';
import { isRequestLineWithUrl, scanRequestLineFrom } from './request_line';

const TRIPLE_QUOTES = '"""';
const QUERY_KEY = '"query"';
const BODY_CONTINUATION_TOKENS = new Set(['{', '[', ',']);

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
 * Returns the index where query text begins if `quoteIndex` starts the `"query"` value.
 * Otherwise returns -1.
 */
const getQueryValueStartIndex = (text: string, quoteIndex: number, quoteLen: 1 | 3): number => {
  return isQueryValueStartAtQuote(text, quoteIndex) ? quoteIndex + quoteLen : -1;
};

type CommentRange = readonly [start: number, end: number];

type StringRange = readonly [start: number, end: number];

interface JsonScanState {
  containers: Array<'object' | 'array'>;
  lastSignificantChar?: string;
  lastSignificantCharIndex?: number;
  trailingCommentStartIndex?: number;
}

/** Mutable state for one scan pass. */
interface ScanState {
  index: number;
  // Quote tracking for the JSON body:
  // - inDoubleQuoteString: between unescaped `" ... "`
  // - inTripleQuoteString: between `""" ... """` (only toggled when not already in double quotes)
  inDoubleQuoteString: boolean;
  inTripleQuoteString: boolean;
  insideComment: boolean;
  requestLineMode: boolean;
  requestLineCommentIndex?: number;
  // Whether the *current* string (double or triple) is the value for `"query"`.
  inQueryValueString: boolean;
  // Whether the current request section is a POST /_query(/async) request.
  inEsqlQueryRequest: boolean;
  // Start index of the query text (first char after the opening quote(s)) when inQueryValueString.
  esqlQueryStartIndex: number;
  tripleQuoteIsJsonValue: boolean;
  commentRanges?: CommentRange[];
  // Offset where the currently open string started; only read when collecting string ranges.
  stringOpenIndex: number;
  stringRanges?: StringRange[];
  json?: JsonScanState;
}

interface ScanOptions {
  collectCommentRanges?: boolean;
  collectStringRanges?: boolean;
  requestLineMode?: boolean;
  trackJsonValue?: boolean;
}

interface ScanResult {
  commentRanges?: CommentRange[];
  stringRanges?: StringRange[];
  esqlQueryIndex: number;
  insideComment: boolean;
  insideEsqlQuery: boolean;
  insideString: boolean;
  insideTripleQuotedJsonValue: boolean;
  insideTripleQuotes: boolean;
  lastSignificantChar?: string;
  lastSignificantCharIndex?: number;
  trailingCommentStartIndex?: number;
}

/**
 * A consumer inspects `text` at `state.index`; when it recognizes its construct it applies the
 * state transition, advances `state.index` past it, and returns true. Order matters: the first
 * consumer that recognizes the position wins.
 */
type ScanConsumer = (text: string, state: ScanState) => boolean;

const isInsideAnyString = ({ inDoubleQuoteString, inTripleQuoteString }: ScanState): boolean =>
  inDoubleQuoteString || inTripleQuoteString;

// On request lines, `#`, `//` and `/*` only start a comment after both the method and the URL
// token: a URL can legitimately contain them (`_search#frag`, `_search/*`) or even start with
// them (`DELETE /*`, `GET //_search`), but a marker after two whitespace-separated tokens is
// past the URL and reads as a trailing comment (`GET _search // docs`).
const findRequestLineComment = (line: string): number | undefined => {
  let tokenCount = 0;
  let insideToken = false;
  let insideQuote = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && !isEscaped(line, index)) {
      if (!insideToken) {
        tokenCount++;
        insideToken = true;
      }
      insideQuote = !insideQuote;
      continue;
    }
    if (!insideQuote && isWhitespace(char)) {
      insideToken = false;
      continue;
    }
    const startsComment =
      !insideQuote &&
      (char === '#' || line.startsWith('//', index) || line.startsWith('/*', index));
    if (!insideToken && tokenCount >= 2 && startsComment) {
      return index;
    }
    if (!insideToken) {
      tokenCount++;
      insideToken = true;
    }
  }
};

const skipWhitespaceForward = (text: string, startIndex: number): number => {
  let index = startIndex;
  while (isWhitespace(text[index])) {
    index++;
  }
  return index;
};

const skipBlockComment = (
  text: string,
  startIndex: number,
  startsInsideComment: boolean
): number | undefined => {
  const commentEndIndex = text.indexOf('*/', startIndex + (startsInsideComment ? 0 : 2));
  return commentEndIndex === -1 ? undefined : skipWhitespaceForward(text, commentEndIndex + 2);
};

const skipBlockCommentPrefixes = (
  text: string,
  startIndex: number,
  startsInsideComment = false
): { index: number; skipped: boolean } | undefined => {
  let index = skipWhitespaceForward(text, startIndex);
  let skipped = startsInsideComment;

  if (startsInsideComment) {
    const nextIndex = skipBlockComment(text, index, true);
    if (nextIndex === undefined) {
      return;
    }
    index = nextIndex;
  }

  while (text.startsWith('/*', index)) {
    const nextIndex = skipBlockComment(text, index, false);
    if (nextIndex === undefined) {
      return;
    }
    skipped = true;
    index = nextIndex;
  }

  return { index, skipped };
};

const getRequestLineCommentStart = (
  text: string,
  lineStartIndex: number,
  nextLineStartIndex: number
): number | undefined => {
  const lineEndIndex =
    text[nextLineStartIndex - 1] === '\n' ? nextLineStartIndex - 1 : nextLineStartIndex;
  const line = text.slice(lineStartIndex, lineEndIndex);
  const commentIndex = findRequestLineComment(line);
  return commentIndex === undefined ? undefined : lineStartIndex + commentIndex;
};

const getRequestLineStartAfterBlockCommentPrefixes = (
  text: string,
  lineStartIndex: number
): number | undefined => skipBlockCommentPrefixes(text, lineStartIndex)?.index;

const consumeRequestLineAt = (
  text: string,
  state: ScanState,
  requestLineStartIndex: number
): boolean => {
  const requestLineScan = scanRequestLineFrom(text, requestLineStartIndex);
  if (!requestLineScan) {
    return false;
  }
  state.inEsqlQueryRequest = requestLineScan.isEsqlQueryRequest;
  if (state.json) {
    state.json.containers.length = 0;
    state.json.lastSignificantChar = undefined;
    state.json.lastSignificantCharIndex = undefined;
    state.json.trailingCommentStartIndex = undefined;
  }
  state.index =
    getRequestLineCommentStart(text, requestLineStartIndex, requestLineScan.nextIndex) ??
    requestLineScan.nextIndex;
  return true;
};

// A request line (e.g. `POST /_query`) starts a new request section and resets JSON context.
const consumeRequestLine: ScanConsumer = (text, state) => {
  if (state.requestLineMode || isInsideAnyString(state) || !isStartOfLine(text, state.index)) {
    return false;
  }
  const requestLineStartIndex = getRequestLineStartAfterBlockCommentPrefixes(text, state.index);
  return (
    requestLineStartIndex !== undefined && consumeRequestLineAt(text, state, requestLineStartIndex)
  );
};

const recordComment = (state: ScanState, start: number, end: number): void => {
  state.commentRanges?.push([start, end]);
};

const recordTrailingComment = (state: ScanState): void => {
  if (state.json?.lastSignificantCharIndex !== undefined) {
    state.json.trailingCommentStartIndex ??= state.index;
  }
};

const consumeLineComment: ScanConsumer = (text, state) => {
  const { index } = state;
  const startsLineComment = text[index] === '#' || text.startsWith('//', index);
  if (!startsLineComment) {
    return false;
  }
  recordTrailingComment(state);
  const newlineIndex = text.indexOf('\n', index);
  recordComment(state, index, newlineIndex === -1 ? text.length : newlineIndex);
  state.insideComment = newlineIndex === -1;
  state.index = newlineIndex === -1 ? text.length : newlineIndex + 1;
  return true;
};

const consumeBlockComment: ScanConsumer = (text, state) => {
  const { index } = state;
  if (!text.startsWith('/*', index)) {
    return false;
  }
  recordTrailingComment(state);
  const commentEndIndex = text.indexOf('*/', index + 2);
  recordComment(state, index, commentEndIndex === -1 ? text.length : commentEndIndex + 2);
  state.insideComment = commentEndIndex === -1;
  if (commentEndIndex === -1) {
    state.index = text.length;
    return true;
  }

  state.index = commentEndIndex + 2;
  const newlineIndex = text.indexOf('\n', index + 2);
  if (!state.requestLineMode && newlineIndex !== -1 && newlineIndex < commentEndIndex) {
    const requestLineStartIndex = getRequestLineStartAfterBlockCommentPrefixes(text, state.index);
    if (
      requestLineStartIndex !== undefined &&
      consumeRequestLineAt(text, state, requestLineStartIndex)
    ) {
      return true;
    }
  }
  return true;
};

// Console comments can contain quote-like text that must not affect string state.
const consumeComment: ScanConsumer = (text, state) => {
  if (
    isInsideAnyString(state) ||
    (state.requestLineMode && state.requestLineCommentIndex !== state.index)
  ) {
    return false;
  }
  return consumeLineComment(text, state) || consumeBlockComment(text, state);
};

const enterString = (text: string, state: ScanState, quoteLen: 1 | 3): void => {
  state.stringOpenIndex = state.index;
  state.esqlQueryStartIndex = getQueryValueStartIndex(text, state.index, quoteLen);
  state.inQueryValueString = state.esqlQueryStartIndex !== -1;
};

const leaveString = (state: ScanState, closingQuoteOffset = 0): void => {
  state.stringRanges?.push([state.stringOpenIndex, state.index + closingQuoteOffset]);
  if (state.json) {
    state.json.lastSignificantChar = '"';
    state.json.lastSignificantCharIndex = state.index + closingQuoteOffset;
    state.json.trailingCommentStartIndex = undefined;
  }
  state.inQueryValueString = false;
  state.esqlQueryStartIndex = -1;
};

const isJsonValuePosition = ({ containers, lastSignificantChar }: JsonScanState): boolean =>
  (containers.at(-1) === 'object' && lastSignificantChar === ':') ||
  (containers.at(-1) === 'array' && (lastSignificantChar === '[' || lastSignificantChar === ','));

// Triple quotes toggle only when not already inside a standard JSON string.
const consumeTripleQuote: ScanConsumer = (text, state) => {
  if (state.inDoubleQuoteString || !text.startsWith(TRIPLE_QUOTES, state.index)) {
    return false;
  }
  state.inTripleQuoteString = !state.inTripleQuoteString;
  if (state.inTripleQuoteString) {
    if (state.json) {
      state.tripleQuoteIsJsonValue = isJsonValuePosition(state.json);
    }
    enterString(text, state, 3);
  } else {
    leaveString(state, 2);
  }
  state.index += 3;
  return true;
};

// Standard JSON string quotes toggle only when unescaped and not inside triple quotes.
const consumeDoubleQuote: ScanConsumer = (text, state) => {
  if (state.inTripleQuoteString || text[state.index] !== '"' || isEscaped(text, state.index)) {
    return false;
  }
  state.inDoubleQuoteString = !state.inDoubleQuoteString;
  if (state.inDoubleQuoteString) {
    enterString(text, state, 1);
  } else {
    leaveString(state);
  }
  state.index++;
  return true;
};

// Fallback: advance one character, tracking JSON container context outside strings.
const consumeChar: ScanConsumer = (text, state) => {
  const { json } = state;
  if (json && !isInsideAnyString(state)) {
    const char = text[state.index];
    if (char === '{') {
      json.containers.push('object');
    } else if (char === '[') {
      json.containers.push('array');
    } else if (char === '}' || char === ']') {
      json.containers.pop();
    }
    if (!isWhitespace(char)) {
      json.lastSignificantChar = char;
      json.lastSignificantCharIndex = state.index;
      json.trailingCommentStartIndex = undefined;
    }
  }
  state.index++;
  return true;
};

// Ordered by precedence; `consumeChar` always consumes, so every pass advances.
const SCAN_CONSUMERS: readonly ScanConsumer[] = [
  consumeRequestLine,
  consumeComment,
  consumeTripleQuote,
  consumeDoubleQuote,
  consumeChar,
];

const scanConsoleText = (
  text: string,
  {
    collectCommentRanges = false,
    collectStringRanges = false,
    requestLineMode = false,
    trackJsonValue = false,
  }: ScanOptions = {}
): ScanResult => {
  const state: ScanState = {
    index: 0,
    inDoubleQuoteString: false,
    inTripleQuoteString: false,
    insideComment: false,
    requestLineMode,
    requestLineCommentIndex: requestLineMode ? findRequestLineComment(text) : undefined,
    inQueryValueString: false,
    inEsqlQueryRequest: false,
    esqlQueryStartIndex: -1,
    tripleQuoteIsJsonValue: false,
    stringOpenIndex: -1,
    ...(collectCommentRanges && { commentRanges: [] }),
    ...(collectStringRanges && { stringRanges: [] }),
    ...(trackJsonValue && { json: { containers: [] } }),
  };

  while (state.index < text.length) {
    for (const consume of SCAN_CONSUMERS) {
      if (consume(text, state)) {
        break;
      }
    }
  }

  if (state.stringRanges && isInsideAnyString(state)) {
    // An unterminated string extends to the end of the text.
    state.stringRanges.push([state.stringOpenIndex, text.length]);
  }

  return {
    insideTripleQuotes: state.inTripleQuoteString,
    insideString: isInsideAnyString(state),
    insideEsqlQuery: state.inEsqlQueryRequest && state.inQueryValueString,
    esqlQueryIndex: state.inEsqlQueryRequest ? state.esqlQueryStartIndex : -1,
    insideComment: state.insideComment,
    lastSignificantChar: state.json?.lastSignificantChar,
    lastSignificantCharIndex: state.json?.lastSignificantCharIndex,
    trailingCommentStartIndex: state.json?.trailingCommentStartIndex,
    commentRanges: state.commentRanges,
    stringRanges: state.stringRanges,
    insideTripleQuotedJsonValue:
      state.json !== undefined && state.inTripleQuoteString && state.tripleQuoteIsJsonValue,
  };
};

const getTextOutsideRanges = (
  text: string,
  startIndex: number,
  ranges: readonly CommentRange[]
): string => {
  const parts: string[] = [];
  let nextIndex = startIndex;

  for (const [rangeStart, rangeEnd] of ranges) {
    if (rangeEnd <= nextIndex) {
      continue;
    }
    parts.push(text.slice(nextIndex, Math.max(nextIndex, rangeStart)));
    nextIndex = Math.max(nextIndex, rangeEnd);
  }

  parts.push(text.slice(nextIndex));
  return parts.join('');
};

/** Returns the current-line text after the cursor with Console comments removed. */
export const getLineRemainderWithoutConsoleComments = (
  contentBeforePosition: string,
  lineContentAfterPosition: string
): string => {
  const text = contentBeforePosition + lineContentAfterPosition;
  const { commentRanges = [] } = scanConsoleText(text, {
    collectCommentRanges: true,
  });
  return getTextOutsideRanges(text, contentBeforePosition.length, commentRanges);
};

const getRequestLineContent = (
  line: string,
  startsInsideBlockComment: boolean
): { content: string; startsAfterPrefix: boolean } | undefined => {
  const prefix = skipBlockCommentPrefixes(line, 0, startsInsideBlockComment);
  if (!prefix) {
    return;
  }
  const requestLine = line.slice(prefix.index);
  return isRequestLineWithUrl(requestLine)
    ? { content: requestLine, startsAfterPrefix: prefix.skipped }
    : undefined;
};

const scanConsoleEnd = (
  text: string,
  { trackJsonValue = false }: { trackJsonValue?: boolean } = {}
): ReturnType<typeof scanConsoleText> => {
  const fullAnalysis = scanConsoleText(text, { trackJsonValue });
  const lastLineStart = text.lastIndexOf('\n') + 1;
  const lastLine = text.slice(lastLineStart);
  const analysisBeforeLastLine = scanConsoleText(text.slice(0, lastLineStart));
  const requestLine = getRequestLineContent(
    lastLine,
    analysisBeforeLastLine.insideComment && !analysisBeforeLastLine.insideString
  );
  const isRequestLine = Boolean(
    requestLine &&
      !analysisBeforeLastLine.insideString &&
      (requestLine.startsAfterPrefix || (!fullAnalysis.insideString && !fullAnalysis.insideComment))
  );
  // `trackJsonValue` is deliberately not forwarded to the request-line rescan: a request line has
  // no JSON body context, and its indices would point into the sliced line rather than `text`
  // (so e.g. a comma-continued request line `GET index-a,` must not read as a body continuation).
  return isRequestLine && requestLine
    ? scanConsoleText(requestLine.content, { requestLineMode: true })
    : fullAnalysis;
};

/**
 * Takes Console text up to the current position and determines whether the position is inside a
 * `""" ... """` triple-quoted string, inside the JSON string value for the `"query"` key, and
 * whether the surrounding request section is a POST /_query(/async) request. When inside an
 * ES|QL query value, also returns the start index of the query text.
 */
export const checkForTripleQuotesAndEsqlQuery = (
  text: string
): {
  insideTripleQuotes: boolean;
  insideEsqlQuery: boolean;
  esqlQueryIndex: number;
} => {
  const { insideTripleQuotes, insideEsqlQuery, esqlQueryIndex } = scanConsoleText(text);
  return { insideTripleQuotes, insideEsqlQuery, esqlQueryIndex };
};

/** Returns true when the end of `text` is inside a Console line or block comment. */
export const isInsideConsoleComment = (text: string): boolean => scanConsoleEnd(text).insideComment;

/** Returns true when the end of `text` is inside a standard or triple-quoted Console string. */
export const isInsideConsoleString = (text: string): boolean => scanConsoleEnd(text).insideString;

/**
 * Scans `text` once and returns a checker that reports whether an offset falls inside a standard
 * or triple-quoted Console string. The offset of an opening quote is outside its string, offsets
 * within the closing delimiter are inside, and an unterminated string extends to the end of the
 * text. Unlike `isInsideConsoleString`, which rescans its whole argument on every call, the
 * returned checker answers in O(log n).
 */
export const createInsideConsoleStringChecker = (text: string): ((offset: number) => boolean) => {
  const { stringRanges = [] } = scanConsoleText(text, { collectStringRanges: true });
  return (offset: number): boolean => {
    let low = 0;
    let high = stringRanges.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const [start, end] = stringRanges[mid];
      if (offset <= start) {
        high = mid - 1;
      } else if (offset > end) {
        low = mid + 1;
      } else {
        return true;
      }
    }
    return false;
  };
};

/** Returns true when the last line's final Console code token opens another body value. */
export const endsWithConsoleBodyContinuation = (text: string): boolean => {
  const { insideString, lastSignificantChar, lastSignificantCharIndex, trailingCommentStartIndex } =
    scanConsoleEnd(text, { trackJsonValue: true });
  if (
    insideString ||
    lastSignificantCharIndex === undefined ||
    !lastSignificantChar ||
    !BODY_CONTINUATION_TOKENS.has(lastSignificantChar)
  ) {
    return false;
  }

  const lastLineStartIndex = text.lastIndexOf('\n') + 1;
  if (lastSignificantCharIndex >= lastLineStartIndex) {
    return true;
  }

  return (
    trailingCommentStartIndex !== undefined &&
    !text.slice(lastSignificantCharIndex + 1, trailingCommentStartIndex).includes('\n')
  );
};

/**
 * Returns true when the end of `text` is inside a triple-quoted string that opened in a JSON
 * *value* position (after `:` in an object, or `[`/`,` in an array). Inputs above the lookback
 * character cap conservatively return false.
 */
export const isInsideTripleQuotedJsonValue = (text: string): boolean =>
  text.length <= MAX_REQUEST_LINE_LOOKBACK_CHARS &&
  scanConsoleText(text, { trackJsonValue: true }).insideTripleQuotedJsonValue;
