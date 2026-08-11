/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_DATA_VIEW_SPEC_TYPE,
} from '@kbn/as-code-data-views-schema';
import type { LegacyMetricConfig, LegacyMetricConfigESQL } from '../../schema/charts/legacy_metric';

/**
 * Basic legacy metric chart with ad hoc dataView
 */
export const basicLegacyMetricWithAdHocDataView: LegacyMetricConfig = {
  type: 'legacy_metric',
  title: 'Test Metric',
  data_source: {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'test-index',
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
export const basicLegacyMetricWithDataView: LegacyMetricConfig = {
  type: 'legacy_metric',
  title: 'Test Metric',
  description: 'A test metric chart',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'test-id',
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
export const esqlLegacyMetric: LegacyMetricConfigESQL = {
  type: 'legacy_metric',
  title: 'Test ESQL Metric',
  description: 'A test metric chart using ESQL',
  data_source: {
    type: 'esql',
    query: 'FROM test-index | STATS count = COUNT(*)',
  },
  metric: {
    column: 'count',
  },
  sampling: 1,
  ignore_global_filters: false,
};

/**
 * Comprehensive legacy metric chart with ad hoc dataView
 */
export const comprehensiveLegacyMetricWithAdHocDataView: LegacyMetricConfig = {
  type: 'legacy_metric',
  title: 'Comprehensive Test Metric',
  description: 'A comprehensive metric chart with all features',
  data_source: {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'comprehensive-index',
    time_field: '@timestamp',
  },
  metric: {
    operation: 'sum',
    field: 'response_time',
    labels: { alignment: 'bottom' },
    values: { alignment: 'right' },
    size: 'l',
    apply_color_to: 'value',
    color: {
      type: 'dynamic',
      steps: [
        { lt: 0, color: '#00FF00' },
        { gte: 0, lt: 300, color: '#FFFF00' },
        { gte: 300, color: '#FF0000' },
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
export const comprehensiveLegacyMetricWithDataView: LegacyMetricConfig = {
  type: 'legacy_metric',
  title: 'Comprehensive Test Metric',
  description: 'A comprehensive metric chart with all features',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'my-custom-data-view-id',
  },
  metric: {
    operation: 'average',
    field: 'response_time',
    label: 'Avg Response Time',
    labels: { alignment: 'bottom' },
    values: { alignment: 'right' },
    apply_color_to: 'value',
    color: {
      type: 'dynamic',
      steps: [
        { lt: 0, color: '#00FF00' },
        { gte: 0, lt: 300, color: '#FFFF00' },
        { gte: 300, color: '#FF0000' },
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
export const comprehensiveEsqlLegacyMetric: LegacyMetricConfigESQL = {
  type: 'legacy_metric',
  title: 'Test ESQL Metric',
  description: 'A test metric chart using ESQL',
  data_source: {
    type: 'esql',
    query: 'FROM test-index | STATS countA = COUNT(*) WHERE a > 1, countB = COUNT(*) WHERE b > 1',
  },
  metric: {
    column: 'countA',
    labels: { alignment: 'top' },
    values: { alignment: 'right' },
    size: 'm',
    apply_color_to: 'background',
    color: {
      type: 'dynamic',
      steps: [
        { lt: 0, color: '#00FF00' },
        { gte: 0, lt: 300, color: '#FFFF00' },
        { gte: 300, color: '#FF0000' },
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
export const legacyMetricWithApplyColorToWithoutColor: LegacyMetricConfig = {
  type: 'legacy_metric',
  title: 'Comprehensive Test Metric',
  description: 'A comprehensive metric chart with all features',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'my-custom-data-view-id',
  },
  metric: {
    operation: 'average',
    field: 'response_time',
    label: 'Avg Response Time',
    labels: { alignment: 'bottom' },
    values: { alignment: 'right' },
    apply_color_to: 'value',
    size: 'l',
  },
  sampling: 1,
  ignore_global_filters: false,
};

/**
 * Legacy metric chart with dataView and color, but without a definedapply_color_to
 */
export const legacyMetricWithColorWithoutApplyColorTo: LegacyMetricConfig = {
  type: 'legacy_metric',
  title: 'Comprehensive Test Metric',
  description: 'A comprehensive metric chart with all features',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'my-custom-data-view-id',
  },
  metric: {
    operation: 'average',
    field: 'response_time',
    label: 'Avg Response Time',
    labels: { alignment: 'bottom' },
    values: { alignment: 'right' },
    size: 'l',
    color: {
      type: 'dynamic',
      steps: [
        { lt: 0, color: '#00FF00' },
        { gte: 0, lt: 300, color: '#FFFF00' },
        { gte: 300, color: '#FF0000' },
      ],
      range: 'absolute',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
};
