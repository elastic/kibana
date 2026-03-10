/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedTimeRange } from '@kbn/presentation-publishing-schemas';
import type { StateManager } from '../../state_manager/types';
import type { StateComparators, WithAllKeys } from '../../state_manager';
import { initializeStateManager } from '../../state_manager';

export type { SerializedTimeRange } from '@kbn/presentation-publishing-schemas';

const defaultTimeRangeState: WithAllKeys<SerializedTimeRange> = {
  time_range: undefined,
};

export const timeRangeComparators: StateComparators<SerializedTimeRange> = {
  time_range: 'deepEquality',
};

export const initializeTimeRangeManager = (
  initialTimeRangeState: SerializedTimeRange
): StateManager<SerializedTimeRange> =>
  initializeStateManager(initialTimeRangeState, defaultTimeRangeState);
