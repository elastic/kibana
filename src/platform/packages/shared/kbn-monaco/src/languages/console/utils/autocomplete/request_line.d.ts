/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const isRequestLineWithUrl: (line: string) => boolean;
/**
 * Attempts to interpret the line starting at `lineStartIndex` as a Console request line
 * (HTTP method + path). When a request line is found, returns:
 * - `isEsqlQueryRequest`: whether this request line is a POST /_query(/async) request
 * - `nextIndex`: where the main scan loop should continue (the beginning of the next line)
 */
export declare const scanRequestLineFrom: (
  text: string,
  lineStartIndex: number
) =>
  | {
      nextIndex: number;
      isEsqlQueryRequest: boolean;
    }
  | undefined;
/**
 * Scans backwards from `positionLineNumber` for a request method line
 * (`GET`/`POST`/...), returning its line number. The default returns the nearest match.
 * The `document` direction returns the range start only after the whole requested range is scanned
 * and a request line is found, so classifiers receive context around untrusted request-like text.
 *
 * Returns `undefined` when no request line is found within the lookback safeguards, so callers
 * can fall back instead of acting on a partially scanned buffer.
 */
export declare const findRequestLineNumber: (
  getLineContent: (lineNumber: number) => string,
  positionLineNumber: number,
  {
    direction,
    rangeStartLineNumber,
  }?: {
    direction?: 'nearest' | 'document';
    rangeStartLineNumber?: number;
  }
) => number | undefined;
