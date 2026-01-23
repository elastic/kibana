/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Visualization types available in Kibana
 */
export type VisualizationType =
  | 'lens'
  | 'area'
  | 'line'
  | 'bar'
  | 'pie'
  | 'metric'
  | 'gauge'
  | 'goal'
  | 'table'
  | 'tagcloud'
  | 'markdown'
  | 'vega'
  | 'timelion'
  | 'tsvb';

/**
 * Visualization type configuration
 */
export const VISUALIZATION_TYPES: Record<VisualizationType, { icon: string; label: string }> = {
  lens: { icon: 'lensApp', label: 'Lens' },
  area: { icon: 'visArea', label: 'Area' },
  line: { icon: 'visLine', label: 'Line' },
  bar: { icon: 'visBarVertical', label: 'Bar' },
  pie: { icon: 'visPie', label: 'Pie' },
  metric: { icon: 'visMetric', label: 'Metric' },
  gauge: { icon: 'visGauge', label: 'Gauge' },
  goal: { icon: 'visGoal', label: 'Goal' },
  table: { icon: 'visTable', label: 'Data Table' },
  tagcloud: { icon: 'visTagCloud', label: 'Tag Cloud' },
  markdown: { icon: 'visText', label: 'Markdown' },
  vega: { icon: 'visVega', label: 'Vega' },
  timelion: { icon: 'visTimelion', label: 'Timelion' },
  tsvb: { icon: 'visVisualBuilder', label: 'TSVB' },
};

/**
 * Mock users for testing
 */
export const MOCK_USERS = [
  'u_665722084_cloud',
  'u_admin_local',
  'u_jane_doe',
  'u_john_smith',
  'u_analyst_1',
] as const;

export type MockUser = (typeof MOCK_USERS)[number];
