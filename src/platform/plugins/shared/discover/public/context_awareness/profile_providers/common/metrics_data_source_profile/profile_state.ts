/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsAggregationSettings } from '@kbn/unified-chart-section-viewer';
import { METRICS_AGGREGATION_SETTINGS_DEFAULTS } from '@kbn/unified-chart-section-viewer';
import type { ProfileStateDefinition, ProfileStateRegistry } from '../../../profile_state';
import { ProfileStateType } from '../../../profile_state';

export const METRICS_AGGREGATION_STATE_DEF: ProfileStateDefinition<MetricsAggregationSettings> = {
  key: 'metricsAggregationSettings',
  descriptor: {
    counterAggregation: { type: ProfileStateType.Persistent },
    gaugeAggregation: { type: ProfileStateType.Persistent },
    histogramPercentile: { type: ProfileStateType.Persistent },
  },
  defaultState: METRICS_AGGREGATION_SETTINGS_DEFAULTS,
};

export const registerMetricsAggregationStateDefinitions = (registry: ProfileStateRegistry) => {
  registry.registerDefinition(METRICS_AGGREGATION_STATE_DEF);
};
