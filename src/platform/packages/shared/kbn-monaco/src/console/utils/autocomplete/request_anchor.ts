/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../monaco_imports';
import type { ParsedRequest } from '../../types';
import { MAX_REQUEST_LINE_LOOKBACK_CHARS, MAX_REQUEST_LINE_LOOKBACK_LINES } from './constants';
import { isRequestLineWithUrl } from './request_line';
import { isInsideTripleQuotedJsonValue } from './triple_quote_scanner';

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

/**
 * Indexes from `fromIndex` down towards 0, at most `limit` of them. Precomputing a capped index
 * array keeps the backward walk stack-flat (deep documents overflow recursive walks) and bounds
 * the allocation to `limit` entries.
 */
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
    // the request's first line was already charged above; charge only the remainder so the
    // budget counts each source character once
    remainingChars -= Math.max(0, requestEndOffset - request.startOffset - line.length - 1);
    if (remainingChars < 0) {
      break;
    }
    fallback ??= startPosition;
    const requestEndPosition = model.getPositionAt(requestEndOffset);
    const requestContent = model.getValueInRange({
      startLineNumber: startPosition.lineNumber,
      startColumn: startPosition.column,
      endLineNumber: requestEndPosition.lineNumber,
      endColumn: requestEndPosition.column,
    });
    if (isInsideTripleQuotedJsonValue(requestContent)) {
      return startPosition;
    }
  }
  return fallback;
};
