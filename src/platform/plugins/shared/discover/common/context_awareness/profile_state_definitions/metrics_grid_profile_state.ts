/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  METRICS_GRID_SETTINGS_DEFAULTS,
  type MetricsGridSettings,
  METRICS_GRID_SORT_DEFAULTS,
  type MetricsGridSort,
} from '@kbn/discover-utils';
import type { ProfileStateDefinition } from '../profile_state';
import { ProfileStateType } from '../profile_state';

export type MetricsState = MetricsGridSettings & MetricsGridSort;

export const METRICS_STATE_DEF: ProfileStateDefinition<MetricsState> = {
  key: 'metricsState',
  descriptor: {
    counterAggregation: { type: ProfileStateType.Url },
    gaugeAggregation: { type: ProfileStateType.Url },
    histogramPercentile: { type: ProfileStateType.Url },
    sortField: { type: ProfileStateType.Url },
    sortDirection: { type: ProfileStateType.Url },
    dimensions: { type: ProfileStateType.Url },
    searchTerm: { type: ProfileStateType.Url },
  },
  defaultState: { ...METRICS_GRID_SETTINGS_DEFAULTS, ...METRICS_GRID_SORT_DEFAULTS },
};
