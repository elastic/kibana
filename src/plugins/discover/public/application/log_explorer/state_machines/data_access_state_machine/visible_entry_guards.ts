/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConditionPredicate } from 'xstate';
import { LogExplorerContext, LogExplorerEvent } from './types';

export const areVisibleEntriesNearStart: ConditionPredicate<
  LogExplorerContext,
  LogExplorerEvent
> = (context, event) =>
  event.type === 'visibleEntriesChanged' &&
  context.topChunk.status === 'loaded' &&
  context.topChunk.startRowIndex > 0 &&
  context.topChunk.chunkSize <= context.topChunk.entries.length &&
  event.visibleStartRowIndex >= context.topChunk.startRowIndex &&
  event.visibleStartRowIndex <=
    context.topChunk.startRowIndex + context.configuration.minimumChunkOverscan;

export const areVisibleEntriesNearEnd: ConditionPredicate<LogExplorerContext, LogExplorerEvent> = (
  context,
  event
) =>
  event.type === 'visibleEntriesChanged' &&
  context.bottomChunk.status === 'loaded' &&
  context.bottomChunk.endRowIndex < context.configuration.maximumRowCount &&
  context.bottomChunk.chunkSize <= context.bottomChunk.entries.length &&
  event.visibleEndRowIndex <= context.bottomChunk.endRowIndex &&
  event.visibleEndRowIndex >=
    context.bottomChunk.endRowIndex - context.configuration.minimumChunkOverscan;
