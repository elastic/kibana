/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricVisualizationState } from '@kbn/lens-common';

import type { LensAttributes } from '../../../../types';
import { canonicalizeCommonState } from './common';

const DEFAULT_LAYER_ID = 'layer_0';

export function canonicalizeMetric(state: LensAttributes): LensAttributes {
  const metricVizState = state.state.visualization as MetricVisualizationState;

  const commonState = canonicalizeCommonState(state, metricVizState.layerId, [
    [metricVizState.metricAccessor, 'metric_formula_accessor_metric'],
    [metricVizState.secondaryMetricAccessor, 'metric_formula_accessor_secondary'],
    [metricVizState.maxAccessor, 'metric_formula_accessor_max'],
    [metricVizState.breakdownByAccessor, 'metric_formula_accessor_breakdown'],
  ]);

  return {
    ...commonState,
    state: {
      ...commonState.state,
      visualization: {
        ...metricVizState,
        layerId: DEFAULT_LAYER_ID,
        metricAccessor: 'metric_formula_accessor_metric',
        ...(metricVizState.secondaryMetricAccessor && {
          secondaryMetricAccessor: 'metric_formula_accessor_secondary',
        }),
        ...(metricVizState.maxAccessor && { maxAccessor: 'metric_formula_accessor_max' }),
        ...(metricVizState.breakdownByAccessor && {
          breakdownByAccessor: 'metric_formula_accessor_breakdown',
        }),
      },
    },
  };
}
