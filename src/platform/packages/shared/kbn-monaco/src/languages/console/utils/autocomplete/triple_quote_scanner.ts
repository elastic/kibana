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
import { scanRequestLineFrom } from './request_line';

const TRIPLE_QUOTES = '"""';
const QUERY_KEY = '"query"';

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

/**
 * Mutable state for one scan pass. `json` is only present when the caller asked to track whether
 * the current triple quote opened in a JSON *value* position (see `isInsideTripleQuotedJsonValue`).
 */
interface ScanState {
  index: number;
  // Quote tracking for the JSON body:
  // - inDoubleQuoteString: between unescaped `" ... "`
  // - inTripleQuoteString: between `""" ... """` (only toggled when not already in double quotes)
  inDoubleQuoteString: boolean;
  inTripleQuoteString: boolean;
  // Whether the *current* string (double or triple) is the value for `"query"`.
  inQueryValueString: boolean;
  // Whether the current request section is a POST /_query(/async) request.
  inEsqlQueryRequest: boolean;
  // Start index of the query text (first char after the opening quote(s)) when inQueryValueString.
  esqlQueryStartIndex: number;
  tripleQuoteIsJsonValue: boolean;
  json?: {
    containers: Array<'object' | 'array'>;
    lastSignificantChar?: string;
  };
}

/**
 * A consumer inspects `text` at `state.index`; when it recognizes its construct it applies the
 * state transition, advances `state.index` past it, and returns true. Order matters: the first
 * consumer that recognizes the position wins.
 */
type ScanConsumer = (text: string, state: ScanState) => boolean;

const isInsideAnyString = ({ inDoubleQuoteString, inTripleQuoteString }: ScanState): boolean =>
  inDoubleQuoteString || inTripleQuoteString;

// A request line (e.g. `POST /_query`) starts a new request section and resets JSON context.
const consumeRequestLine: ScanConsumer = (text, state) => {
  if (isInsideAnyString(state) || !isStartOfLine(text, state.index)) {
    return false;
  }
  const requestLineScan = scanRequestLineFrom(text, state.index);
  if (!requestLineScan) {
    return false;
  }
  state.inEsqlQueryRequest = requestLineScan.isEsqlQueryRequest;
  if (state.json) {
    state.json.containers.length = 0;
    state.json.lastSignificantChar = undefined;
  }
  state.index = requestLineScan.nextIndex;
  return true;
};

// Console comments can contain quote-like text that must not affect string state.
const consumeComment: ScanConsumer = (text, state) => {
  if (isInsideAnyString(state)) {
    return false;
  }
  const { index } = state;
  if (text[index] === '#' || (text[index] === '/' && text[index + 1] === '/')) {
    const newlineIndex = text.indexOf('\n', index);
    state.index = newlineIndex === -1 ? text.length : newlineIndex + 1;
    return true;
  }
  if (text[index] === '/' && text[index + 1] === '*') {
    const commentEndIndex = text.indexOf('*/', index + 2);
    state.index = commentEndIndex === -1 ? text.length : commentEndIndex + 2;
    return true;
  }
  return false;
};

const enterString = (text: string, state: ScanState, quoteLen: 1 | 3): void => {
  state.esqlQueryStartIndex = getQueryValueStartIndex(text, state.index, quoteLen);
  state.inQueryValueString = state.esqlQueryStartIndex !== -1;
};

const leaveString = (state: ScanState): void => {
  if (state.json) {
    state.json.lastSignificantChar = '"';
  }
  state.inQueryValueString = false;
  state.esqlQueryStartIndex = -1;
};

const isJsonValuePosition = ({
  containers,
  lastSignificantChar,
}: NonNullable<ScanState['json']>): boolean =>
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
    leaveString(state);
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

const analyzeTripleQuotesAndEsqlQuery = (
  text: string,
  { trackJsonValue = false }: { trackJsonValue?: boolean } = {}
): {
  insideTripleQuotes: boolean;
  insideEsqlQuery: boolean;
  esqlQueryIndex: number;
  insideTripleQuotedJsonValue: boolean;
} => {
  const state: ScanState = {
    index: 0,
    inDoubleQuoteString: false,
    inTripleQuoteString: false,
    inQueryValueString: false,
    inEsqlQueryRequest: false,
    esqlQueryStartIndex: -1,
    tripleQuoteIsJsonValue: false,
    ...(trackJsonValue && { json: { containers: [] } }),
  };

  while (state.index < text.length) {
    for (const consume of SCAN_CONSUMERS) {
      if (consume(text, state)) {
        break;
      }
    }
  }

  return {
    insideTripleQuotes: state.inTripleQuoteString,
    insideEsqlQuery: state.inEsqlQueryRequest && state.inQueryValueString,
    esqlQueryIndex: state.inEsqlQueryRequest ? state.esqlQueryStartIndex : -1,
    insideTripleQuotedJsonValue:
      state.json !== undefined && state.inTripleQuoteString && state.tripleQuoteIsJsonValue,
  };
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
  const { insideTripleQuotedJsonValue, ...result } = analyzeTripleQuotesAndEsqlQuery(text);
  return result;
};

/**
 * Returns true when the end of `text` is inside a triple-quoted string that opened in a JSON
 * *value* position (after `:` in an object, or `[`/`,` in an array). Inputs above the lookback
 * character cap conservatively return false.
 */
export const isInsideTripleQuotedJsonValue = (text: string): boolean =>
  text.length <= MAX_REQUEST_LINE_LOOKBACK_CHARS &&
  analyzeTripleQuotesAndEsqlQuery(text, { trackJsonValue: true }).insideTripleQuotedJsonValue;
