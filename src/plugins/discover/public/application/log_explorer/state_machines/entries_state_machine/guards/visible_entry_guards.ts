/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConditionPredicate } from 'xstate';
import { getEntriesFromChunk } from '../../../utils/entry';
import { EntriesMachineContext, EntriesMachineEvent } from '../types';

export const areVisibleEntriesNearStart: ConditionPredicate<
  EntriesMachineContext,
  EntriesMachineEvent
> = (context, event) => {
  return event.type === 'visibleEntriesChanged' && event.visibleStartRowIndex <= 1;
};

export const areVisibleEntriesNearEnd: ConditionPredicate<
  EntriesMachineContext,
  EntriesMachineEvent
> = (context, event) => {
  if (event.type !== 'visibleEntriesChanged') {
    return false;
  }

  const entryCount =
    getEntriesFromChunk(context.topChunk).length + getEntriesFromChunk(context.bottomChunk).length;

  return event.visibleEndRowIndex >= entryCount - 1;
};

export const areVisibleEntriesNearChunkBoundary: ConditionPredicate<
  EntriesMachineContext,
  EntriesMachineEvent
> = (context, event) => {
  if (event.type !== 'visibleEntriesChanged') {
    return false;
  }

  const chunkBoundaryRowIndex = getEntriesFromChunk(context.topChunk).length;

  return (
    event.visibleStartRowIndex <= chunkBoundaryRowIndex &&
    event.visibleEndRowIndex >= chunkBoundaryRowIndex
  );
};
