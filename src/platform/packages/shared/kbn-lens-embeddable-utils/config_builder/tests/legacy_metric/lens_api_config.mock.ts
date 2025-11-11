/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LegacyMetricState } from '../../schema';

/**
 * Basic legacy metric chart with ad hoc dataView
 */
export const basicLegacyMetricWithAdHocDataView: LegacyMetricState = {
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
    empty_as_null: false,
  },
  sampling: 1,
  ignore_global_filters: false,
};

/**
 * Basic legacy metric chart with existing dataView
 */
export const basicLegacyMetricWithDataView: LegacyMetricState = {
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
    empty_as_null: false,
  },
  sampling: 1,
  ignore_global_filters: false,
};

/**
 * ESQL-based legacy metric chart
 */
export const esqlLegacyMetric: LegacyMetricState = {
  type: 'legacy_metric',
  title: 'Test ESQL Metric',
  description: 'A test metric chart using ESQL',
  dataset: {
    type: 'esql',
    query: 'FROM test-index | STATS count = COUNT(*)',
  },
  metric: {
    operation: 'value',
    column: 'count',
  },
  sampling: 1,
  ignore_global_filters: false,
};

/**
 * Comprehensive legacy metric chart with ad hoc dataView
 */
export const comprehensiveLegacyMetricWithAdHocDataView: LegacyMetricState = {
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
    field: 'response_time',
    alignments: {
      labels: 'bottom',
      value: 'right',
    },
    size: 'l',
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
  sampling: 1,
  ignore_global_filters: false,
};

/**
 * Comprehensive legacy metric chart with existing dataView
 */
export const comprehensiveLegacyMetricWithDataView: LegacyMetricState = {
  type: 'legacy_metric',
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
  sampling: 1,
  ignore_global_filters: false,
};

/**
 * Comprehensive ESQL-based legacy metric chart
 */
export const comprehensiveEsqlLegacyMetric: LegacyMetricState = {
  type: 'legacy_metric',
  title: 'Test ESQL Metric',
  description: 'A test metric chart using ESQL',
  dataset: {
    type: 'esql',
    query: 'FROM test-index | STATS countA = COUNT(*) WHERE a > 1, countB = COUNT(*) WHERE b > 1',
  },
  metric: {
    operation: 'value',
    column: 'countA',
    alignments: {
      labels: 'top',
      value: 'right',
    },
    size: 'm',
    apply_color_to: 'background',
    color: {
      type: 'dynamic',
      steps: [
        { type: 'from', from: 0, color: '#00FF00' },
        { type: 'exact', value: 300, color: '#FFFF00' },
        { type: 'to', to: 300, color: '#FF0000' },
      ],
      range: 'absolute',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
};

/**
 * Legacy metric chart with dataView and apply_color_to, but without a defined color
 */
export const legacyMetricWithApplyColorToWithoutColor: LegacyMetricState = {
  type: 'legacy_metric',
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
    alignments: {
      labels: 'bottom',
      value: 'right',
    },
    apply_color_to: 'value',
    size: 'l',
  },
  sampling: 1,
  ignore_global_filters: false,
};

/**
 * Legacy metric chart with dataView and color, but without a definedapply_color_to
 */
export const legacyMetricWithColorWithoutApplyColorTo: LegacyMetricState = {
  type: 'legacy_metric',
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
    alignments: {
      labels: 'bottom',
      value: 'right',
    },
    size: 'l',
    color: {
      type: 'dynamic',
      steps: [
        { type: 'from', from: 0, color: '#00FF00' },
        { type: 'exact', value: 300, color: '#FFFF00' },
        { type: 'to', to: 300, color: '#FF0000' },
      ],
      range: 'absolute',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
};
