/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParsedRequest } from '@kbn/monaco';
import type { monaco } from '@kbn/monaco';
import {
  checkForTripleQuotesAndEsqlQuery,
  findRequestLineNumber,
  getFallbackRequestStartPosition,
  isInsideConsoleString,
} from '@kbn/monaco/src/languages/console/utils';
import type { AdjustedParsedRequest } from '../types';

export interface TripleQuoteContext {
  insideTripleQuotes: boolean;
  insideEsqlQuery: boolean;
  insideString?: boolean;
}

const OUTSIDE_TRIPLE_QUOTES: TripleQuoteContext = {
  insideTripleQuotes: false,
  insideEsqlQuery: false,
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

/** The earlier of the fallback anchor and the selected request's own start. */
const resolveRequestAnchor = (
  model: monaco.editor.ITextModel,
  request: AdjustedParsedRequest,
  fallbackStart: monaco.IPosition | undefined
): monaco.IPosition =>
  fallbackStart !== undefined && model.getOffsetAt(fallbackStart) < request.startOffset
    ? fallbackStart
    : model.getPositionAt(request.startOffset);

/** Content from the best available request anchor up to the cursor, or undefined without one. */
const getContentBeforePosition = (
  model: monaco.editor.ITextModel,
  position: monaco.IPosition,
  rangeStart: monaco.IPosition | undefined
): string | undefined => {
  if (rangeStart) {
    return getRangeText(model, rangeStart, position);
  }
  const requestLineNumber = findRequestLineNumber(
    (lineNumber) => model.getLineContent(lineNumber),
    position.lineNumber,
    { direction: 'document' }
  );
  return requestLineNumber === undefined
    ? undefined
    : getRangeText(model, { lineNumber: requestLineNumber, column: 1 }, position);
};

const toTripleQuoteContext = (content: string): TripleQuoteContext => {
  const { insideTripleQuotes, insideEsqlQuery } = checkForTripleQuotesAndEsqlQuery(content);
  return { insideTripleQuotes, insideEsqlQuery, insideString: isInsideConsoleString(content) };
};

const coversLine = (request: AdjustedParsedRequest, lineNumber: number): boolean =>
  request.startLineNumber <= lineNumber && request.endLineNumber >= lineNumber;

/**
 * Decides whether `position` sits inside a triple-quoted string and whether that string is the
 * ES|QL `"query"` value, anchoring the scan to the selected request when one covers the cursor
 * and to the capped fallback anchor otherwise.
 */
export const getTripleQuoteContext = (
  model: monaco.editor.ITextModel,
  position: monaco.IPosition,
  selectedRequests: AdjustedParsedRequest[],
  parsedRequests: ParsedRequest[]
): TripleQuoteContext => {
  const fallbackStart = getFallbackRequestStartPosition(
    parsedRequests,
    model,
    position.lineNumber,
    position.column
  );

  for (const request of selectedRequests) {
    if (coversLine(request, position.lineNumber)) {
      const anchor = resolveRequestAnchor(model, request, fallbackStart);
      return toTripleQuoteContext(getRangeText(model, anchor, position));
    }
  }

  const contentBefore = getContentBeforePosition(model, position, fallbackStart);
  return contentBefore ? toTripleQuoteContext(contentBefore) : OUTSIDE_TRIPLE_QUOTES;
};
