/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getEntriesFromChunk } from '../../../utils/entry';
import { EntriesMachineContext, EntriesMachineEvent } from '../types';

export const scrollAfterChunkBoundary = (
  context: EntriesMachineContext,
  event: EntriesMachineEvent
) => {
  if (event.type !== 'visibleEntriesChanged') {
    return;
  }

  const chunkBoundaryRowIndex = getEntriesFromChunk(context.topChunk).length;

  event.gridApi.scrollToItem?.({
    rowIndex: chunkBoundaryRowIndex,
    align: 'start',
  });
};

export const scrollBeforeChunkBoundary = (
  context: EntriesMachineContext,
  event: EntriesMachineEvent
) => {
  if (event.type !== 'visibleEntriesChanged') {
    return;
  }

  const chunkBoundaryRowIndex = getEntriesFromChunk(context.topChunk).length;

  event.gridApi.scrollToItem?.({
    rowIndex: chunkBoundaryRowIndex - 1,
    align: 'end',
  });
};

export const scrollBeforeEnd = (context: EntriesMachineContext, event: EntriesMachineEvent) => {
  if (event.type !== 'visibleEntriesChanged') {
    return;
  }

  const endRowIndex =
    getEntriesFromChunk(context.topChunk).length +
    getEntriesFromChunk(context.bottomChunk).length -
    1;

  event.gridApi.scrollToItem?.({
    rowIndex: endRowIndex,
    align: 'end',
  });
};
