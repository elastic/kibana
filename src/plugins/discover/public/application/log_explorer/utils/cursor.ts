/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogExplorerCursor, LogExplorerCursorRT, LogExplorerPosition, Timestamp } from '../types';
import { decodeOrThrow } from './runtime_types';

export const getCursorFromPosition = (position: LogExplorerPosition): LogExplorerCursor => [
  position.timestamp,
  position.tiebreaker,
];

export const getPositionFromCursor = ([
  timestamp,
  tiebreaker,
]: LogExplorerCursor): LogExplorerPosition => ({
  timestamp: typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString(),
  tiebreaker: typeof tiebreaker === 'number' ? tiebreaker : parseInt(tiebreaker, 10),
});

export const getPositionFromTimestamp = (timestamp: string) => ({
  timestamp,
  tiebreaker: 0,
});

export const getPositionFromMsEpoch = (msEpoch: number) => ({
  timestamp: new Date(msEpoch).toISOString(),
  tiebreaker: 0,
});

export const getTimestampFromPosition = ({ timestamp }: LogExplorerPosition): Timestamp =>
  timestamp;

export const getPredecessorPosition = (position: LogExplorerPosition): LogExplorerPosition => ({
  ...position,
  tiebreaker: position.tiebreaker - 1,
});

export const getSuccessorPosition = (position: LogExplorerPosition): LogExplorerPosition => ({
  ...position,
  tiebreaker: position.tiebreaker + 1,
});

export const getCursorFromHitSort = decodeOrThrow(LogExplorerCursorRT);
