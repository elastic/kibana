/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GaugeState } from '../../schema';

/**
 * Basic gauge chart with ad hoc dataView
 */
export const basicGaugeWithAdHocDataView: GaugeState = {
  type: 'gauge',
  title: 'Test Gauge',
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
 * Basic gauge chart with existing dataView
 */
export const basicGaugeWithDataView: GaugeState = {
  type: 'gauge',
  title: 'Test Gauge',
  description: 'A test gauge chart',
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
 * ESQL-based gauge chart
 */
export const esqlGauge: GaugeState = {
  type: 'gauge',
  title: 'Test ESQL Gauge',
  description: 'A test gauge chart using ESQL',
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
 * Comprehensive gauge chart with ad hoc dataView
 */
export const comprehensiveGaugeWithAdHocDataView: GaugeState = {
  type: 'gauge',
  title: 'Comprehensive Test Gauge',
  description: 'A comprehensive metric chart with all features',
  dataset: {
    type: 'index',
    index: 'comprehensive-index',
    time_field: '@timestamp',
  },
  metric: {
    operation: 'average',
    field: 'bytes',
    min: { operation: 'formula', formula: 'round(average(bytes) - 1000)' },
    max: { operation: 'max', field: 'bytes' },
    goal: { operation: 'static_value', value: 7000 },
    hide_title: false,
    sub_title: 'Bytes Subtitle',
    ticks: 'bands',
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
 * Comprehensive gauge chart with existing dataView
 */
export const comprehensiveGaugeWithDataView: GaugeState = {
  type: 'gauge',
  title: 'Comprehensive Test Gauge',
  description: 'A comprehensive metric chart with all features',
  dataset: {
    type: 'dataView',
    id: 'my-custom-data-view-id',
  },
  metric: {
    operation: 'average',
    field: 'bytes',
    min: { operation: 'formula', formula: 'round(average(bytes) - 1000)' },
    goal: { operation: 'static_value', value: 7000 },
    hide_title: false,
    sub_title: 'Bytes Subtitle',
    ticks: 'bands',
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
 * Comprehensive ESQL-based gauge chart
 */
export const comprehensiveEsqlGauge: GaugeState = {
  type: 'gauge',
  title: 'Comprehensive Test Gauge',
  description: 'A comprehensive metric chart with all features',
  dataset: {
    type: 'esql',
    query: 'FROM test-index | STATS countA = COUNT(*) WHERE a > 1, countB = COUNT(*) WHERE b > 1',
  },
  metric: {
    operation: 'value',
    column: 'countA',
    min: { operation: 'value', column: 'countB' },
    hide_title: true,
    sub_title: 'Bytes Subtitle',
    ticks: 'bands',
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
