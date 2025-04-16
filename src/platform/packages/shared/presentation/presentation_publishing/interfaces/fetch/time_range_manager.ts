/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeRange } from '@kbn/es-query';
import { StateManager } from '../../state_manager/types';
import { StateComparators, WithAllKeys, initializeStateManager } from '../../state_manager';

export interface SerializedTimeRange {
  timeRange?: TimeRange | undefined;
}

const defaultTimeRangeState: WithAllKeys<SerializedTimeRange> = {
  timeRange: undefined,
};

export const timeRangeComparators: StateComparators<SerializedTimeRange> = {
  timeRange: 'deepEquality',
};

export const initializeTimeRangeManager = (
  initialTimeRangeState: SerializedTimeRange
): StateManager<SerializedTimeRange> =>
  initializeStateManager(initialTimeRangeState, defaultTimeRangeState);
