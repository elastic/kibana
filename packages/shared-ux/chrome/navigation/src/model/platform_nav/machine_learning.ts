/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavItemProps } from '../../../types';

export const mlItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Overview',
        id: 'overview',
        href: '/app/ml/overview',
      },
      {
        name: 'Notifications',
        id: 'notifications',
        href: '/app/ml/notifications',
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
        href: '/app/ml/jobs',
      },
      {
        name: 'Anomaly explorer',
        id: 'explorer',
        href: '/app/ml/explorer',
      },
      {
        name: 'Single metric viewer',
        id: 'single_metric_viewer',
        href: '/app/ml/timeseriesexplorer',
      },
      {
        name: 'Settings',
        id: 'settings',
        href: '/app/ml/settings',
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
        href: '/app/ml/data_frame_analytics',
      },
      {
        name: 'Results explorer',
        id: 'results_explorer',
        href: '/app/ml/data_frame_analytics/exploration',
      },
      {
        name: 'Analytics map',
        id: 'analytics_map',
        href: '/app/ml/data_frame_analytics/map',
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
        href: '/app/ml/trained_models',
      },
      {
        name: 'Nodes',
        id: 'nodes',
        href: '/app/ml/nodes',
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
        href: '/app/ml/filedatavisualizer',
      },
      {
        name: 'Data view',
        id: 'data_view',
        href: '/app/ml/datavisualizer_index_select',
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
        href: '/app/ml/aiops/explain_log_rate_spikes_index_select',
      },
      {
        name: 'Log pattern analysis',
        id: 'log_pattern_analysis',
        href: '/app/ml/aiops/log_categorization_index_select',
      },
    ],
  },
];
