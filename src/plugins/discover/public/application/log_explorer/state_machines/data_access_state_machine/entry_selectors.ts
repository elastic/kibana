/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogExplorerChunk, LogExplorerEntry } from '../../types';
import { DataAccessService } from './state_machine';
import { selectIsReloading } from './status_selectors';

export const selectLoadedEntries = (
  state: DataAccessService['state']
): {
  startRowIndex: number | undefined;
  chunkBoundaryRowIndex: number | undefined;
  endRowIndex: number | undefined;
  entries: LogExplorerEntry[];
} => {
  if (selectIsReloading(state)) {
    return {
      startRowIndex: undefined,
      chunkBoundaryRowIndex: undefined,
      endRowIndex: undefined,
      entries: [],
    };
  }

  const { topChunk, bottomChunk } = state.context;

  const startRowIndex = getStartRowIndex(topChunk);
  const chunkBoundaryRowIndex = getStartRowIndex(bottomChunk);
  const endRowIndex = getEndRowIndex(bottomChunk);

  return {
    startRowIndex,
    chunkBoundaryRowIndex,
    endRowIndex,
    entries: [
      ...(topChunk.status === 'loaded' ? topChunk.entries : []),
      ...(bottomChunk.status === 'loaded' ? bottomChunk.entries : []),
    ],
  };
};

const getStartRowIndex = (chunk: LogExplorerChunk): number => {
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

const getEndRowIndex = (chunk: LogExplorerChunk): number => {
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
