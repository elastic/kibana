/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRICS_GRID_SORT_DEFAULTS, type MetricsGridSort } from '@kbn/discover-utils';
import type { ProfileStateDefinition } from '../profile_state';
import { ProfileStateType } from '../profile_state';

export const METRICS_GRID_SORT_STATE_DEF: ProfileStateDefinition<MetricsGridSort> = {
  key: 'metricsGridSort',
  descriptor: {
    field: { type: ProfileStateType.Persistent },
    direction: { type: ProfileStateType.Persistent },
  },
  defaultState: METRICS_GRID_SORT_DEFAULTS,
};
