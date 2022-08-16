/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogExplorerChunk, LogExplorerRow, Timestamp } from '../types';
import { getTimestampFromPosition } from './cursor';

export const getStartRowIndex = (chunk: LogExplorerChunk): number => {
  // TODO: the zero fallback should never happen, but the typestate is not strict enough
  switch (chunk.status) {
    case 'loaded':
    case 'loading-bottom':
    case 'loading-top':
      return chunk.startRowIndex;
    case 'empty':
      return chunk.rowIndex;
    case 'uninitialized':
      return 0;
  }
};

export const getEndRowIndex = (chunk: LogExplorerChunk): number => {
  // TODO: the zero fallback should never happen, but the typestate is not strict enough
  switch (chunk.status) {
    case 'loaded':
    case 'loading-bottom':
    case 'loading-top':
      return chunk.endRowIndex;
    case 'empty':
      return chunk.rowIndex;
    case 'uninitialized':
      return 0;
  }
};

export const getRowsFromChunk = (chunk: LogExplorerChunk): Array<[number, LogExplorerRow]> => {
  const rowIndexOffset = getStartRowIndex(chunk);

  switch (chunk.status) {
    case 'loaded':
      return chunk.entries.map((entry, indexInChunk) => [
        indexInChunk + rowIndexOffset,
        { type: 'loaded-entry', entry },
      ]);
    case 'uninitialized':
    case 'empty':
      return [[rowIndexOffset, { type: 'empty' }]];
    case 'loading-top':
    case 'loading-bottom':
      return [[rowIndexOffset, { type: 'loading' }]];
  }
};

export const getStartRowTimestamp = (chunk: LogExplorerChunk): Timestamp | undefined => {
  switch (chunk.status) {
    case 'loaded':
    case 'loading-bottom':
    case 'empty':
      return getTimestampFromPosition(chunk.startPosition);
    case 'loading-top':
      return getTimestampFromPosition(chunk.endPosition);
    case 'uninitialized':
      return;
  }
};

export const getEndRowTimestamp = (chunk: LogExplorerChunk): Timestamp | undefined => {
  switch (chunk.status) {
    case 'loaded':
    case 'loading-top':
    case 'empty':
      return getTimestampFromPosition(chunk.endPosition);
    case 'loading-bottom':
      return getTimestampFromPosition(chunk.startPosition);
    case 'uninitialized':
      return;
  }
};
