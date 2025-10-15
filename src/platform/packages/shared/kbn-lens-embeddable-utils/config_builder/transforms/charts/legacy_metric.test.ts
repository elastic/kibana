/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromAPItoLensState, fromLensStateToAPI } from './legacy_metric';
import { lensApiStateSchema } from '../../schema';
import type { LegacyMetricState } from '../../schema';
import { merge } from 'lodash';

type InputTypeLegacyMetricChart = Omit<
  LegacyMetricState,
  'sampling' | 'ignore_global_filters' | 'metric'
> & {
  ignore_global_filters?: LegacyMetricState['ignore_global_filters'];
  sampling?: LegacyMetricState['sampling'];
  metric: Omit<LegacyMetricState['metric'], 'size' | 'alignments'> &
    Partial<Pick<LegacyMetricState['metric'], 'size' | 'alignments'>>;
};

/**
 * Mind that this won't include query/filters validation/defaults
 */
function validateAndApiToApiTransforms(originalObject: InputTypeLegacyMetricChart) {
  return fromLensStateToAPI(
    fromAPItoLensState(lensApiStateSchema.validate(originalObject) as LegacyMetricState)
  );
}

function mergeWithDefaults(originalObject: InputTypeLegacyMetricChart) {
  const defaults = {
    sampling: 1,
    ignore_global_filters: false,
  };
  return merge(structuredClone(defaults), structuredClone(originalObject));
}

describe('legacy metric chart transformations', () => {
  describe('roundtrip conversion', () => {
    it('basic legacy metric chart with ad hoc dataView', () => {
      const basicLegacyMetricConfig: InputTypeLegacyMetricChart = {
        type: 'legacy_metric',
        title: 'Test Metric',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'count',
          label: 'Count of documents',
          // @ts-expect-error - Need to figure out how get the right input type
          empty_as_null: false,
        },
      };

      const finalAPIState = validateAndApiToApiTransforms(basicLegacyMetricConfig);
      expect(finalAPIState).toEqual(mergeWithDefaults(basicLegacyMetricConfig));
    });

    it('basic legacy metric chart with dataView', () => {
      const basicLegacyMetricConfig: InputTypeLegacyMetricChart = {
        type: 'legacy_metric',
        title: 'Test Metric',
        description: 'A test metric chart',
        dataset: {
          type: 'dataView',
          id: 'test-id',
        },
        metric: {
          operation: 'count',
          label: 'Count of documents',
          // @ts-expect-error - Need to figure out how get the right input type
          empty_as_null: false,
        },
      };

      const finalAPIState = validateAndApiToApiTransforms(basicLegacyMetricConfig);
      expect(mergeWithDefaults(basicLegacyMetricConfig)).toEqual(finalAPIState);
    });

    it('ESQL-based legacy metric chart', () => {
      const esqlLegacyMetricConfig: InputTypeLegacyMetricChart = {
        type: 'legacy_metric',
        title: 'Test ESQL Metric',
        description: 'A test metric chart using ESQL',
        dataset: {
          type: 'esql',
          query: 'FROM test-index | STATS count = COUNT(*)',
        },
        metric: {
          operation: 'value',
          // @ts-expect-error - Need to figure out how get the right input type
          column: 'count',
        },
      };

      const finalAPIState = validateAndApiToApiTransforms(esqlLegacyMetricConfig);
      expect(mergeWithDefaults(esqlLegacyMetricConfig)).toEqual(finalAPIState);
    });

    it('comprehensive legacy metric chart with ad hoc data view', () => {
      const comprehensiveLegacyMetricConfig: InputTypeLegacyMetricChart = {
        type: 'legacy_metric',
        title: 'Comprehensive Test Metric',
        description: 'A comprehensive metric chart with all features',
        dataset: {
          type: 'index',
          index: 'comprehensive-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'sum',
          // @ts-expect-error - Need to figure out how get the right input type
          field: 'response_time',
          apply_color_to: 'value',
          color: {
            type: 'dynamic',
            steps: [
              { type: 'from', from: 0, color: '#00FF00' },
              { type: 'exact', value: 300, color: '#FFFF00' },
              { type: 'to', to: 300, color: '#FF0000' },
            ],
            range: 'absolute',
          },
          empty_as_null: false,
        },
      };

      const finalAPIState = validateAndApiToApiTransforms(comprehensiveLegacyMetricConfig);
      expect(mergeWithDefaults(comprehensiveLegacyMetricConfig)).toEqual(finalAPIState);
    });

    it('comprehensive legacy metric chart with data view', () => {
      const comprehensiveLegacyMetricConfig: InputTypeLegacyMetricChart = {
        type: 'legacy_metric',
        title: 'Comprehensive Test Metric',
        description: 'A comprehensive metric chart with all features',
        dataset: {
          type: 'dataView',
          id: 'my-custom-data-view-id',
        },
        metric: {
          operation: 'average',
          // @ts-expect-error - Need to figure out how get the right input type
          field: 'response_time',
          label: 'Avg Response Time',
          alignments: {
            labels: 'bottom',
            value: 'right',
          },
          apply_color_to: 'value',
          color: {
            type: 'dynamic',
            steps: [
              { type: 'from', from: 0, color: '#00FF00' },
              { type: 'exact', value: 300, color: '#FFFF00' },
              { type: 'to', to: 300, color: '#FF0000' },
            ],
            range: 'absolute',
          },
          size: 'l',
        },
      };
      const finalAPIState = validateAndApiToApiTransforms(comprehensiveLegacyMetricConfig);
      expect(mergeWithDefaults(comprehensiveLegacyMetricConfig)).toEqual(finalAPIState);
    });

    it('comprehensive ESQL-based legacy metric chart', () => {
      const esqlLegacyMetricConfig: InputTypeLegacyMetricChart = {
        type: 'legacy_metric',
        title: 'Test ESQL Metric',
        description: 'A test metric chart using ESQL',
        dataset: {
          type: 'esql',
          query:
            'FROM test-index | STATS countA = COUNT(*) WHERE a > 1, countB = COUNT(*) WHERE b > 1',
        },
        metric: {
          operation: 'value',
          // @ts-expect-error - Need to figure out how get the right input type
          column: 'countA',
          alignments: {
            labels: 'top',
            value: 'right',
          },
        },
      };

      // Convert API config to Lens state and back
      const finalAPIState = validateAndApiToApiTransforms(esqlLegacyMetricConfig);
      expect(mergeWithDefaults(esqlLegacyMetricConfig)).toEqual(finalAPIState);
    });
  });
});
