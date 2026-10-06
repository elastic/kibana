/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Returns the current-line text after the cursor with Console comments removed. */
export declare const getLineRemainderWithoutConsoleComments: (
  contentBeforePosition: string,
  lineContentAfterPosition: string
) => string;
/**
 * Takes Console text up to the current position and determines whether the position is inside a
 * `""" ... """` triple-quoted string, inside the JSON string value for the `"query"` key, and
 * whether the surrounding request section is a POST /_query(/async) request. When inside an
 * ES|QL query value, also returns the start index of the query text.
 */
export declare const checkForTripleQuotesAndEsqlQuery: (text: string) => {
  insideTripleQuotes: boolean;
  insideEsqlQuery: boolean;
  esqlQueryIndex: number;
};
/** Returns true when the end of `text` is inside a Console line or block comment. */
export declare const isInsideConsoleComment: (text: string) => boolean;
/** Returns true when the end of `text` is inside a standard or triple-quoted Console string. */
export declare const isInsideConsoleString: (text: string) => boolean;
/**
 * Scans `text` once and returns a checker that reports whether an offset falls inside a standard
 * or triple-quoted Console string. The offset of an opening quote is outside its string, offsets
 * within the closing delimiter are inside, and an unterminated string extends to the end of the
 * text. Unlike `isInsideConsoleString`, which rescans its whole argument on every call, the
 * returned checker answers in O(log n).
 */
export declare const createInsideConsoleStringChecker: (
  text: string
) => (offset: number) => boolean;
/** Returns true when the last line's final Console code token opens another body value. */
export declare const endsWithConsoleBodyContinuation: (text: string) => boolean;
/**
 * Returns true when the end of `text` is inside a triple-quoted string that opened in a JSON
 * *value* position (after `:` in an object, or `[`/`,` in an array). Inputs above the lookback
 * character cap conservatively return false.
 */
export declare const isInsideTripleQuotedJsonValue: (text: string) => boolean;
