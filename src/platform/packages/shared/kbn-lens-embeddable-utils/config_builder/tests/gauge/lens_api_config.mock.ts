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
import type { GaugeConfig } from '../../schema/charts/gauge';

/**
 * Basic gauge chart with ad hoc dataView
 */
export const basicGaugeWithAdHocDataView: GaugeConfig = {
  type: 'gauge',
  title: 'Test Gauge',
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
 * Basic gauge chart with existing dataView
 */
export const basicGaugeWithDataView: GaugeConfig = {
  type: 'gauge',
  title: 'Test Gauge',
  description: 'A test gauge chart',
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
 * ESQL-based gauge chart
 */
export const esqlGauge: GaugeConfig = {
  type: 'gauge',
  title: 'Test ESQL Gauge',
  description: 'A test gauge chart using ESQL',
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
 * Comprehensive gauge chart with ad hoc dataView
 */
export const comprehensiveGaugeWithAdHocDataView: GaugeConfig = {
  type: 'gauge',
  title: 'Comprehensive Test Gauge',
  description: 'A comprehensive metric chart with all features',
  data_source: {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'comprehensive-index',
    time_field: '@timestamp',
  },
  metric: {
    operation: 'average',
    field: 'bytes',
    min: { operation: 'formula', formula: 'round(average(bytes) - 1000)' },
    max: { operation: 'max', field: 'bytes' },
    goal: { operation: 'static_value', value: 7000 },
    title: { visible: true },
    subtitle: 'Bytes Subtitle',
    ticks: {
      visible: true,
      mode: 'bands',
    },
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
 * Comprehensive gauge chart with existing dataView
 */
export const comprehensiveGaugeWithDataView: GaugeConfig = {
  type: 'gauge',
  title: 'Comprehensive Test Gauge',
  description: 'A comprehensive metric chart with all features',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'my-custom-data-view-id',
  },
  metric: {
    operation: 'average',
    field: 'bytes',
    min: { operation: 'formula', formula: 'round(average(bytes) - 1000)' },
    goal: { operation: 'static_value', value: 7000 },
    title: { visible: true },
    subtitle: 'Bytes Subtitle',
    ticks: {
      visible: true,
      mode: 'bands',
    },
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
 * Comprehensive ESQL-based gauge chart
 */
export const comprehensiveEsqlGauge: GaugeConfig = {
  type: 'gauge',
  title: 'Comprehensive Test Gauge',
  description: 'A comprehensive metric chart with all features',
  data_source: {
    type: 'esql',
    query: 'FROM test-index | STATS countA = COUNT(*) WHERE a > 1, countB = COUNT(*) WHERE b > 1',
  },
  metric: {
    column: 'countA',
    min: { column: 'countB' },
    title: { visible: false },
    subtitle: 'Bytes Subtitle',
    ticks: {
      visible: true,
      mode: 'bands',
    },
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
