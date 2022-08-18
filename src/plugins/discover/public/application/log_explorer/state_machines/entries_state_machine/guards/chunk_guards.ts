/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { ConditionPredicate } from 'xstate';
import { getTimestampFromPosition } from '../../../utils/cursor';
import { getEndRowTimestamp, getStartRowTimestamp } from '../../../utils/row';
import { LogExplorerContext, LogExplorerEvent } from './types';

export const hasLoadedTopChunk: ConditionPredicate<LogExplorerContext, LogExplorerEvent> = (
  context,
  event
) => context.topChunk.status === 'loaded';

export const hasLoadedBottomChunk: ConditionPredicate<LogExplorerContext, LogExplorerEvent> = (
  context,
  event
) => context.bottomChunk.status === 'loaded';

export const hasEmptyTopChunk: ConditionPredicate<LogExplorerContext, LogExplorerEvent> = (
  context,
  event
) => context.topChunk.status === 'empty';

export const hasEmptyBottomChunk: ConditionPredicate<LogExplorerContext, LogExplorerEvent> = (
  context,
  event
) => context.bottomChunk.status === 'empty';

export const isWithinLoadedChunks: ConditionPredicate<LogExplorerContext, LogExplorerEvent> = (
  context,
  event
) => {
  if (event.type !== 'positionChanged') {
    return false;
  }

  const startTimestamp =
    getStartRowTimestamp(context.topChunk) ?? getStartRowTimestamp(context.bottomChunk);
  const endTimestamp =
    getEndRowTimestamp(context.bottomChunk) ?? getEndRowTimestamp(context.topChunk);

  return (
    startTimestamp != null &&
    endTimestamp != null &&
    moment
      .utc(getTimestampFromPosition(event.position))
      .isBetween(moment.utc(startTimestamp), moment.utc(endTimestamp))
  );
};
