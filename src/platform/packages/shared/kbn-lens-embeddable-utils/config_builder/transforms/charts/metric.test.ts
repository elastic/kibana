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
import { lensApiStateSchema } from '../../schema';
import type { MetricState } from '../../schema';
import { has, merge } from 'lodash';

type InputTypeMetricChart = Omit<MetricState, 'sampling' | 'ignore_global_filters' | 'metric'> & {
  ignore_global_filters?: MetricState['ignore_global_filters'];
  sampling?: MetricState['sampling'];
  metric: Omit<MetricState['metric'], 'fit' | 'alignments'> &
    Partial<Pick<MetricState['metric'], 'fit' | 'alignments'>>;
};

const defaultValues = [
  {
    path: 'metric',
    value: {
      metric: {
        fit: false,
        alignments: {
          labels: 'left',
          value: 'left',
        },
      },
    } as const,
  },
  {
    path: 'breakdown_by',
    value: {
      breakdown_by: {
        // defaults for terms breakdown by
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
    } as const,
  },
  {
    path: 'secondary_metric.compare',
    value: {
      secondary_metric: {
        compare: {
          palette: LENS_METRIC_COMPARE_TO_PALETTE_DEFAULT,
        },
      } as const,
    },
  },
];

function validateAndApiToApiTransforms(originalObject: InputTypeMetricChart) {
  return fromLensStateToAPI(fromAPItoLensState(lensApiStateSchema.validate(originalObject)));
}

function mergeWithDefaults(originalObject: InputTypeMetricChart) {
  const defaults = [
    {
      sampling: 1,
      ignore_global_filters: false,
    },
  ];
  for (const { path, value } of defaultValues) {
    if (has(originalObject, path)) {
      // @ts-expect-error - Need to figure out how to type this better
      defaults.push(value);
    }
  }
  // @ts-expect-error - Need to figure out how to type this better
  return merge(...structuredClone(defaults), structuredClone(originalObject));
}

describe('metric chart transformations', () => {
  describe('roundtrip conversion', () => {
    it('basic metric chart with ad hoc dataView', () => {
      const basicMetricConfig: InputTypeMetricChart = {
        type: 'metric',
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

      const finalAPIState = validateAndApiToApiTransforms(basicMetricConfig);
      expect(finalAPIState).toEqual(mergeWithDefaults(basicMetricConfig));
    });

    it('basic metric chart with dataView', () => {
      const basicMetricConfig: InputTypeMetricChart = {
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
          // @ts-expect-error - Need to figure out how get the right input type
          empty_as_null: false,
        },
      };

      const finalAPIState = validateAndApiToApiTransforms(basicMetricConfig);
      expect(mergeWithDefaults(basicMetricConfig)).toEqual(finalAPIState);
    });

    it('chart with secondary metric', () => {
      const metricWithSecondaryConfig: InputTypeMetricChart = {
        type: 'metric',
        title: 'Test Metric with Secondary',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'unique_count',
          // @ts-expect-error - Need to figure out how get the right input type
          field: 'price',
          label: 'Count of Prices',
          fit: true,
          color: {
            type: 'static',
            color: '#FF0000',
          },
          empty_as_null: false,
        },
        secondary_metric: {
          operation: 'sum',
          field: 'quantity',
          label: 'Total Quantity',
          prefix: 'Total: ',
          empty_as_null: false,
        },
      };

      const finalAPIState = validateAndApiToApiTransforms(metricWithSecondaryConfig);
      expect(mergeWithDefaults(metricWithSecondaryConfig)).toEqual(finalAPIState);
    });

    it('metric chart with breakdown', () => {
      const metricWithBreakdownConfig: InputTypeMetricChart = {
        type: 'metric',
        title: 'Test Metric with Breakdown',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'sum',
          // @ts-expect-error - Need to figure out how get the right input type
          field: 'revenue',
          label: 'Total Revenue',
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
      };

      const finalAPIState = validateAndApiToApiTransforms(metricWithBreakdownConfig);
      expect(mergeWithDefaults(metricWithBreakdownConfig)).toEqual(finalAPIState);
    });

    it('metric chart with background chart (bar)', () => {
      const metricWithBarConfig: InputTypeMetricChart = {
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
          // @ts-expect-error - Need to figure out how get the right input type
          empty_as_null: false,
          background_chart: {
            type: 'bar',
            direction: 'horizontal',
            goal_value: {
              operation: 'max',
              field: 'max_value',
            },
          },
        },
      };

      const finalAPIState = validateAndApiToApiTransforms(metricWithBarConfig);
      expect(mergeWithDefaults(metricWithBarConfig)).toEqual(finalAPIState);
    });

    it('ESQL-based metric chart', () => {
      const esqlMetricConfig: InputTypeMetricChart = {
        type: 'metric',
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
          fit: true,
        },
      };

      const finalAPIState = validateAndApiToApiTransforms(esqlMetricConfig);
      expect(mergeWithDefaults(esqlMetricConfig)).toEqual(finalAPIState);
    });

    it('comprehensive metric chart with ad hoc data view', () => {
      const comprehensiveMetricConfig: InputTypeMetricChart = {
        type: 'metric',
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
          label: 'Sum Response Time',
          sub_label: 'milliseconds',
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
          empty_as_null: false,
        },
        secondary_metric: {
          operation: 'count',
          label: 'Request Count',
          prefix: 'Requests: ',
          compare: {
            to: 'primary',
            icon: false,
            value: true,
          },
          empty_as_null: false,
        },
        breakdown_by: {
          operation: 'terms',
          fields: ['service_name'],
          columns: 5,
          size: 10,
        },
      };

      const finalAPIState = validateAndApiToApiTransforms(comprehensiveMetricConfig);
      expect(mergeWithDefaults(comprehensiveMetricConfig)).toEqual(finalAPIState);
    });

    it('comprehensive metric chart with data view', () => {
      const comprehensiveMetricConfig: InputTypeMetricChart = {
        type: 'metric',
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
      };
      const finalAPIState = validateAndApiToApiTransforms(comprehensiveMetricConfig);
      expect(mergeWithDefaults(comprehensiveMetricConfig)).toEqual(finalAPIState);
    });

    it('comprehensive ESQL-based metric chart with compare to feature', () => {
      const esqlMetricConfig: InputTypeMetricChart = {
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
          // @ts-expect-error - Need to figure out how get the right input type
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
      };

      // Convert API config to Lens state and back
      const finalAPIState = validateAndApiToApiTransforms(esqlMetricConfig);
      expect(mergeWithDefaults(esqlMetricConfig)).toEqual(finalAPIState);
    });
  });
});
