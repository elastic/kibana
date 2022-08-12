/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConditionPredicate } from 'xstate';
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
