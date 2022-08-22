/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConditionPredicate } from 'xstate';
import { EntriesMachineContext, EntriesMachineEvent } from '../types';

export const areVisibleEntriesNearStart: ConditionPredicate<
  EntriesMachineContext,
  EntriesMachineEvent
> = (context, event) =>
  event.type === 'visibleEntriesChanged' &&
  context.topChunk.status === 'loaded' &&
  event.visibleStartRowIndex >= context.topChunk.startRowIndex &&
  event.visibleStartRowIndex <=
    context.topChunk.startRowIndex + context.configuration.minimumChunkOverscan;

export const areVisibleEntriesNearEnd: ConditionPredicate<
  EntriesMachineContext,
  EntriesMachineEvent
> = (context, event) =>
  event.type === 'visibleEntriesChanged' &&
  context.bottomChunk.status === 'loaded' &&
  event.visibleEndRowIndex <= context.bottomChunk.endRowIndex &&
  event.visibleEndRowIndex >=
    context.bottomChunk.endRowIndex - context.configuration.minimumChunkOverscan;
