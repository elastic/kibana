/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import { breakdownMetricAttributes } from '../../../metric/breakdown.mock';
import { canonicalizeCommonState } from './common';

describe('common', () => {
  describe('canonicalizeCommonState', () => {
    it('should convert metric common state', () => {
      const metricVizState = breakdownMetricAttributes.state
        .visualization as MetricVisualizationState;

      const layerId = metricVizState.layerId;

      const result = canonicalizeCommonState(breakdownMetricAttributes, layerId, [
        [metricVizState.metricAccessor, 'metric_formula_accessor_metric'],
        [metricVizState.secondaryMetricAccessor, 'metric_formula_accessor_secondary'],
        [metricVizState.maxAccessor, 'metric_formula_accessor_max'],
        [metricVizState.breakdownByAccessor, 'metric_formula_accessor_breakdown'],
      ]);
      result.state.visualization = {}; // ignore viz state for snapshot

      expect(result).toMatchSnapshot();
    });
  });
});
