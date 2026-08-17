/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiscoverTabType } from '@kbn/discover-utils';
import { createProfileSavedStateTransform } from '../profile_saved_state';
import { METRICS_STATE_DEF } from '../profile_state_definitions/metrics_grid_profile_state';

/**
 * Saves the selected metrics grid dimensions with the tab. The other `MetricsState`
 * fields (the per-instrument aggregation overrides and sort) are not saved -- they stay
 * local to the tab, so this transform contributes only `dimensions` to the `metrics` tab
 * type payload.
 */
export const METRICS_GRID_SAVED_STATE_TRANSFORM = createProfileSavedStateTransform({
  tabType: DiscoverTabType.Metrics,
  stateDefinition: METRICS_STATE_DEF,
  savedFields: ['dimensions'] as const,
  toSavedState: ({ dimensions }) => ({ dimensions }),
  fromSavedState: ({ dimensions }) => ({ dimensions }),
});
