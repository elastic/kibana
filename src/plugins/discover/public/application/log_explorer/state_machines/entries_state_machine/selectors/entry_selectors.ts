/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import memoizeOne from 'memoize-one';
import { v4 } from 'uuid';
import { LogExplorerChunk, LogExplorerEntry, LogExplorerRow, Timestamp } from '../../../types';
import { getEntriesFromChunk } from '../../../utils/entry';
import {
  getEndRowIndex,
  getEndRowTimestamp,
  getRowsFromChunk,
  getStartRowIndex,
  getStartRowTimestamp,
} from '../../../utils/row';
import { EntriesService } from '../state_machine';
import { selectIsReloading } from './status_selectors';

export const selectRows = (
  state: EntriesService['state']
): {
  chunkBoundaryRowIndex: number | undefined;
  endRowIndex: number | undefined;
  maximumRowIndex: number;
  minimumRowIndex: number;
  rows: Map<number, LogExplorerRow>;
  startRowIndex: number | undefined;
} => {
  const maximumRowIndex = state.context.configuration.maximumRowCount - 1;
  const minimumRowIndex = 0;

  if (selectIsReloading(state)) {
    return {
      chunkBoundaryRowIndex: undefined,
      endRowIndex: undefined,
      maximumRowIndex,
      minimumRowIndex,
      rows: new Map(),
      startRowIndex: undefined,
    };
  }

  const { topChunk, bottomChunk } = state.context;

  const startRowIndex = getStartRowIndex(topChunk);
  const chunkBoundaryRowIndex = getStartRowIndex(bottomChunk);
  const endRowIndex = getEndRowIndex(bottomChunk);

  const rows = memoizedGetRowMapFromChunksForSelector(topChunk, bottomChunk);

  return {
    chunkBoundaryRowIndex,
    endRowIndex,
    maximumRowIndex,
    minimumRowIndex,
    rows,
    startRowIndex,
  };
};

export const memoizedSelectRows = memoizeOne(selectRows);

const getRowMapFromChunks = (topChunk: LogExplorerChunk, bottomChunk: LogExplorerChunk) =>
  new Map([...getRowsFromChunk(topChunk), ...getRowsFromChunk(bottomChunk)]);

const memoizedGetRowMapFromChunksForSelector = memoizeOne(getRowMapFromChunks);

export const selectVisibleTimeRange = (
  state: EntriesService['state']
): {
  startTimestamp?: Timestamp;
  endTimestamp?: Timestamp;
} => {
  // TODO: use real data from parallel histogram sub-state
  return {
    startTimestamp: getStartRowTimestamp(state.context.topChunk),
    endTimestamp: getEndRowTimestamp(state.context.bottomChunk),
  };
};

export const selectDiscoverRows = (
  state: EntriesService['state']
): {
  chunkBoundaryRowIndex: number | undefined;
  endRowIndex: number | undefined;
  generationId: string;
  rows: LogExplorerEntry[];
  startRowIndex: number | undefined;
} => {
  if (selectIsReloading(state)) {
    return {
      chunkBoundaryRowIndex: undefined,
      endRowIndex: undefined,
      generationId: v4(),
      rows: [],
      startRowIndex: undefined,
    };
  }

  const { topChunk, bottomChunk } = state.context;

  const { generationId, rows } = getDiscoverRowsFromChunksMemoized(topChunk, bottomChunk);
  const startRowIndex = 0;
  const endRowIndex = rows.length - 1;
  const chunkBoundaryRowIndex = topChunk.status === 'loaded' ? topChunk.entries.length : 0;

  return {
    generationId,
    rows,
    startRowIndex,
    endRowIndex,
    chunkBoundaryRowIndex,
  };
};

export const selectDiscoverRowsMemoized = memoizeOne(selectDiscoverRows);

const getDiscoverRowsFromChunks = (topChunk: LogExplorerChunk, bottomChunk: LogExplorerChunk) => ({
  generationId: v4(),
  rows: [...getEntriesFromChunk(topChunk), ...getEntriesFromChunk(bottomChunk)],
});

const getDiscoverRowsFromChunksMemoized = memoizeOne(getDiscoverRowsFromChunks);
