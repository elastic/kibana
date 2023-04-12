/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavItemProps } from '../../../types';

const mlLocator = (params: { page: string; pageState?: string }) => ({
  locator: { id: 'ML_APP_LOCATOR', params },
});

export const mlItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Overview',
        id: 'overview',
        ...mlLocator({ page: 'overview' }),
      },
      {
        name: 'Notifications',
        id: 'notifications',
        ...mlLocator({ page: 'notifications' }),
      },
    ],
  },
  {
    name: 'Anomaly detection',
    id: 'anomaly_detection',
    items: [
      {
        name: 'Jobs',
        id: 'jobs',
        ...mlLocator({ page: 'jobs' }),
      },
      {
        name: 'Anomaly explorer',
        id: 'explorer',
        ...mlLocator({ page: 'explorer' }),
      },
      {
        name: 'Single metric viewer',
        id: 'single_metric_viewer',
        ...mlLocator({ page: 'timeseriesexplorer' }),
      },
      {
        name: 'Settings',
        id: 'settings',
        ...mlLocator({ page: 'settings' }),
      },
    ],
  },
  {
    name: 'Data frame analytics',
    id: 'data_frame_analytics',
    items: [
      {
        name: 'Jobs',
        id: 'jobs',
        ...mlLocator({ page: 'data_frame_analytics' }),
      },
      {
        name: 'Results explorer',
        id: 'results_explorer',
        ...mlLocator({ page: 'data_frame_analytics/exploration' }),
      },
      {
        name: 'Analytics map',
        id: 'analytics_map',
        ...mlLocator({ page: 'data_frame_analytics/map' }),
      },
    ],
  },
  {
    name: 'Model management',
    id: 'model_management',
    items: [
      {
        name: 'Trained models',
        id: 'trained_models',
        ...mlLocator({ page: 'trained_models' }),
      },
      {
        name: 'Nodes',
        id: 'nodes',
        ...mlLocator({ page: 'nodes' }),
      },
    ],
  },
  {
    name: 'Data visualizer',
    id: 'data_visualizer',
    items: [
      {
        name: 'File',
        id: 'file',
        ...mlLocator({ page: 'filedatavisualizer' }),
      },
      {
        name: 'Data page',
        id: 'data_view',
        ...mlLocator({ page: 'datavisualizer_index_select' }),
      },
    ],
  },
  {
    name: 'AIOps labs',
    id: 'aiops_labs',
    items: [
      {
        name: 'Explain log rate spikes',
        id: 'explain_log_rate_spikes',
        ...mlLocator({ page: 'explain_log_rate_spikes_index_select' }),
      },
      {
        name: 'Log pattern analysis',
        id: 'log_pattern_analysis',
        ...mlLocator({ page: 'log_categorization_index_select' }),
      },
    ],
  },
];
