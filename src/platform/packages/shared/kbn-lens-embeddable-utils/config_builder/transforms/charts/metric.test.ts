/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  fromAPItoLensState,
  fromLensStateToAPI,
  LENS_METRIC_COMPARE_TO_PALETTE_DEFAULT,
} from './metric';
import type { MetricState } from '../../schema';
import { merge } from 'lodash';

// ts-expect-error
function mergeDefaultsToNewCopy(originalObject, filledDefaults) {
  return merge(structuredClone(originalObject), filledDefaults);
}

describe('metric chart transformations', () => {
  describe('roundtrip conversion', () => {
    it('basic metric chart with ad hoc dataView', () => {
      const basicMetricConfig: MetricState = {
        type: 'metric',
        title: 'Test Metric',
        description: 'A test metric chart',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'count',
          label: 'Count of documents',
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: false,
          empty_as_null: false,
        },
        sampling: 1,
        ignore_global_filters: false,
      };

      const finalAPIState = fromLensStateToAPI(fromAPItoLensState(basicMetricConfig));
      const filledDefaults = { metric: { fit: false } };
      expect(finalAPIState).toEqual(mergeDefaultsToNewCopy(basicMetricConfig, filledDefaults));
    });

    it('basic metric chart with dataView', () => {
      const basicMetricConfig: MetricState = {
        type: 'metric',
        title: 'Test Metric',
        description: 'A test metric chart',
        dataset: {
          type: 'dataView',
          id: 'test-id',
        },
        metric: {
          operation: 'count',
          label: 'Count of documents',
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: false,
          empty_as_null: false,
        },
        sampling: 1,
        ignore_global_filters: false,
      };

      const finalAPIState = fromLensStateToAPI(fromAPItoLensState(basicMetricConfig));
      const filledDefaults = { metric: { fit: false } };
      expect(finalAPIState).toEqual(mergeDefaultsToNewCopy(basicMetricConfig, filledDefaults));
    });

    it('chart with secondary metric', () => {
      const metricWithSecondaryConfig: MetricState = {
        type: 'metric',
        title: 'Test Metric with Secondary',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'average',
          field: 'price',
          label: 'Average Price',
          alignments: {
            labels: 'center',
            value: 'right',
          },
          fit: true,
          color: {
            type: 'static',
            color: '#FF0000',
          },
        },
        secondary_metric: {
          operation: 'sum',
          field: 'quantity',
          label: 'Total Quantity',
          prefix: 'Total: ',
          empty_as_null: false,
        },
        sampling: 0.5,
        ignore_global_filters: true,
      };

      // Convert API config to Lens state
      const lensState = fromAPItoLensState(metricWithSecondaryConfig);

      // Convert back from Lens state to API config
      const convertedConfig = fromLensStateToAPI(lensState);

      // Verify the result has the same type as the input
      expect(convertedConfig.type).toBe(metricWithSecondaryConfig.type);
      expect(convertedConfig).toHaveProperty('metric');
      expect(convertedConfig).toHaveProperty('secondary_metric');
      expect(convertedConfig).toHaveProperty('dataset');
      expect(convertedConfig).toHaveProperty('title');
    });

    it('metric chart with breakdown', () => {
      const metricWithBreakdownConfig: MetricState = {
        type: 'metric',
        title: 'Test Metric with Breakdown',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'sum',
          field: 'revenue',
          label: 'Total Revenue',
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: false,
          icon: {
            name: 'dollar',
            align: 'left',
          },
          empty_as_null: false,
        },
        breakdown_by: {
          operation: 'terms',
          fields: ['category'],
          columns: 3,
          size: 5,
          collapse_by: 'sum',
        },
        sampling: 1,
        ignore_global_filters: false,
      };

      const finalAPIState = fromLensStateToAPI(fromAPItoLensState(metricWithBreakdownConfig));
      const filledDefaults = {
        breakdown_by: {
          excludes: {
            as_regex: false,
            values: [],
          },
          includes: {
            as_regex: false,
            values: [],
          },
          increase_accuracy: false,
          other_bucket: { include_documents_without_field: false },
          rank_by: { direction: 'asc', type: 'alphabetical' },
        },
      };
      expect(finalAPIState).toEqual(
        mergeDefaultsToNewCopy(metricWithBreakdownConfig, filledDefaults)
      );
    });

    it('metric chart with background chart (bar)', () => {
      const metricWithBarConfig: MetricState = {
        type: 'metric',
        title: 'Test Metric with Bar Background',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'count',
          label: 'Document Count',
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: false,
          background_chart: {
            type: 'bar',
            direction: 'horizontal',
            goal_value: {
              operation: 'max',
              field: 'max_value',
            },
          },
          empty_as_null: false,
        },
        sampling: 1,
        ignore_global_filters: false,
      };

      const finalAPIState = fromLensStateToAPI(fromAPItoLensState(metricWithBarConfig));
      const filledDefaults = {};
      expect(finalAPIState).toEqual(mergeDefaultsToNewCopy(metricWithBarConfig, filledDefaults));
    });

    it('ESQL-based metric chart', () => {
      const esqlMetricConfig: MetricState = {
        type: 'metric',
        title: 'Test ESQL Metric',
        description: 'A test metric chart using ESQL',
        dataset: {
          type: 'esql',
          query: 'FROM test-index | STATS count = COUNT(*)',
        },
        metric: {
          operation: 'value',
          column: 'count',
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: true,
        },
        sampling: 1,
        ignore_global_filters: true,
      };

      const finalAPIState = fromLensStateToAPI(fromAPItoLensState(esqlMetricConfig));
      const filledDefaults = {};
      expect(finalAPIState).toEqual(mergeDefaultsToNewCopy(esqlMetricConfig, filledDefaults));
    });

    it('comprehensive metric chart with ad hoc data view', () => {
      const comprehensiveMetricConfig: MetricState = {
        type: 'metric',
        title: 'Comprehensive Test Metric',
        description: 'A comprehensive metric chart with all features',
        dataset: {
          type: 'index',
          index: 'comprehensive-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'average',
          field: 'response_time',
          label: 'Avg Response Time',
          sub_label: 'milliseconds',
          alignments: {
            labels: 'center',
            value: 'right',
          },
          fit: true,
          icon: {
            name: 'clock',
            align: 'right',
          },
          color: {
            type: 'static',
            color: '#00FF00',
          },
          background_chart: {
            type: 'trend',
          },
        },
        secondary_metric: {
          operation: 'count',
          label: 'Request Count',
          prefix: 'Requests: ',
          empty_as_null: false,
          compare: {
            to: 'primary',
            icon: false,
            value: true,
          },
        },
        breakdown_by: {
          operation: 'terms',
          fields: ['service_name'],
          columns: 5,
          size: 10,
        },
        sampling: 0.8,
        ignore_global_filters: true,
      };

      const finalAPIState = fromLensStateToAPI(fromAPItoLensState(comprehensiveMetricConfig));
      const filledDefaults = {
        secondary_metric: {
          compare: {
            palette: LENS_METRIC_COMPARE_TO_PALETTE_DEFAULT,
          },
        },
        breakdown_by: {
          excludes: {
            as_regex: false,
            values: [],
          },
          includes: {
            as_regex: false,
            values: [],
          },
          increase_accuracy: false,
          other_bucket: { include_documents_without_field: false },
          rank_by: { direction: 'asc', type: 'alphabetical' },
        },
      };
      expect(finalAPIState).toEqual(
        mergeDefaultsToNewCopy(comprehensiveMetricConfig, filledDefaults)
      );
    });

    it('comprehensive metric chart with data view', () => {
      const comprehensiveMetricConfig: MetricState = {
        type: 'metric',
        title: 'Comprehensive Test Metric',
        description: 'A comprehensive metric chart with all features',
        dataset: {
          type: 'dataView',
          id: 'my-custom-data-view-id',
        },
        metric: {
          operation: 'average',
          field: 'response_time',
          label: 'Avg Response Time',
          sub_label: 'milliseconds',
          alignments: {
            labels: 'center',
            value: 'right',
          },
          fit: true,
          icon: {
            name: 'clock',
            align: 'right',
          },
          color: {
            type: 'static',
            color: '#00FF00',
          },
          background_chart: {
            type: 'trend',
          },
        },
        secondary_metric: {
          operation: 'count',
          label: 'Request Count',
          prefix: 'Requests: ',
          color: {
            type: 'static',
            color: '#0000FF',
          },
          empty_as_null: false,
        },
        breakdown_by: {
          operation: 'terms',
          fields: ['service_name'],
          columns: 5,
          size: 10,
        },
        sampling: 0.8,
        ignore_global_filters: true,
      };
      const finalAPIState = fromLensStateToAPI(fromAPItoLensState(comprehensiveMetricConfig));
      const filledDefaults = {
        breakdown_by: {
          excludes: {
            as_regex: false,
            values: [],
          },
          includes: {
            as_regex: false,
            values: [],
          },
          increase_accuracy: false,
          other_bucket: { include_documents_without_field: false },
          rank_by: { direction: 'asc', type: 'alphabetical' },
        },
      };
      expect(finalAPIState).toEqual(
        mergeDefaultsToNewCopy(comprehensiveMetricConfig, filledDefaults)
      );
    });

    it('comprehensive ESQL-based metric chart with comapre to feature', () => {
      const esqlMetricConfig: MetricState = {
        type: 'metric',
        title: 'Test ESQL Metric',
        description: 'A test metric chart using ESQL',
        dataset: {
          type: 'esql',
          query:
            'FROM test-index | STATS countA = COUNT(*) WHERE a > 1, countB = COUNT(*) WHERE b > 1',
        },
        metric: {
          operation: 'value',
          column: 'countA',
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: true,
        },
        secondary_metric: {
          operation: 'value',
          column: 'countB',
          compare: {
            to: 'primary',
            icon: true,
            value: false,
          },
        },
        sampling: 1,
        ignore_global_filters: true,
      };

      // Convert API config to Lens state and back
      const finalAPIState = fromLensStateToAPI(fromAPItoLensState(esqlMetricConfig));

      const filledDefaults = { secondary_metric: { compare: { palette: 'compare_to' } } };
      expect(finalAPIState).toEqual(mergeDefaultsToNewCopy(esqlMetricConfig, filledDefaults));
    });
  });
});
