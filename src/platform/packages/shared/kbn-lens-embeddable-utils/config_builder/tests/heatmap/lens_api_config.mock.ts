/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HeatmapConfig } from '../../schema/charts/heatmap';

export const withTemporalXAxisScale: HeatmapConfig = {
  type: 'heatmap',
  ignore_global_filters: false,
  sampling: 1,
  data_source: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs\n| STATS count() BY ts = BUCKET(@timestamp, 1 hour)',
  },
  metric: { column: 'count()' },
  x: { column: 'ts' },
  axis: {
    x: {
      labels: { visible: true },
      title: { visible: false },
      scale: 'temporal',
    },
    y: {
      labels: { visible: true },
      title: { visible: false },
    },
  },
};

export const withOrdinalXAxisScale: HeatmapConfig = {
  type: 'heatmap',
  ignore_global_filters: false,
  sampling: 1,
  data_source: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | STATS count = count() BY geo.src',
  },
  metric: { column: 'count' },
  x: { column: 'geo.src' },
  axis: {
    x: {
      labels: { visible: true },
      title: { visible: false },
      scale: 'ordinal',
    },
    y: {
      labels: { visible: true },
      title: { visible: false },
    },
  },
};

export const withLinearXAxisScale: HeatmapConfig = {
  type: 'heatmap',
  ignore_global_filters: false,
  sampling: 1,
  data_source: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | STATS count = count() BY bytes',
  },
  metric: { column: 'count' },
  x: { column: 'bytes' },
  axis: {
    x: {
      labels: { visible: true },
      title: { visible: false },
      scale: 'linear',
    },
    y: {
      labels: { visible: true },
      title: { visible: false },
    },
  },
};
