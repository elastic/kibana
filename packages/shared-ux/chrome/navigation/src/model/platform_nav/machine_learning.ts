/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavigationNodeViewModel } from '../../../types';

// TODO: Declare ChromeNavigationNode[] (with "link" to app id or deeplink id)
// and then call an api on the Chrome service to convert to ChromeNavigationNodeViewModel
// with its "href", "isActive"... metadata

export const mlItemSet: ChromeNavigationNodeViewModel[] = [
  {
    title: '',
    id: 'root',
    items: [
      {
        title: 'Overview',
        id: 'overview',
        href: '/app/ml/overview',
      },
      {
        title: 'Notifications',
        id: 'notifications',
        href: '/app/ml/notifications',
      },
    ],
  },
  {
    title: 'Anomaly detection',
    id: 'anomaly_detection',
    items: [
      {
        title: 'Jobs',
        id: 'jobs',
        href: '/app/ml/jobs',
      },
      {
        title: 'Anomaly explorer',
        id: 'explorer',
        href: '/app/ml/explorer',
      },
      {
        title: 'Single metric viewer',
        id: 'single_metric_viewer',
        href: '/app/ml/timeseriesexplorer',
      },
      {
        title: 'Settings',
        id: 'settings',
        href: '/app/ml/settings',
      },
    ],
  },
  {
    title: 'Data frame analytics',
    id: 'data_frame_analytics',
    items: [
      {
        title: 'Jobs',
        id: 'jobs',
        href: '/app/ml/data_frame_analytics',
      },
      {
        title: 'Results explorer',
        id: 'results_explorer',
        href: '/app/ml/data_frame_analytics/exploration',
      },
      {
        title: 'Analytics map',
        id: 'analytics_map',
        href: '/app/ml/data_frame_analytics/map',
      },
    ],
  },
  {
    title: 'Model management',
    id: 'model_management',
    items: [
      {
        title: 'Trained models',
        id: 'trained_models',
        href: '/app/ml/trained_models',
      },
      {
        title: 'Nodes',
        id: 'nodes',
        href: '/app/ml/nodes',
      },
    ],
  },
  {
    title: 'Data visualizer',
    id: 'data_visualizer',
    items: [
      {
        title: 'File',
        id: 'file',
        href: '/app/ml/filedatavisualizer',
      },
      {
        title: 'Data view',
        id: 'data_view',
        href: '/app/ml/datavisualizer_index_select',
      },
    ],
  },
  {
    title: 'AIOps labs',
    id: 'aiops_labs',
    items: [
      {
        title: 'Explain log rate spikes',
        id: 'explain_log_rate_spikes',
        href: '/app/ml/aiops/explain_log_rate_spikes_index_select',
      },
      {
        title: 'Log pattern analysis',
        id: 'log_pattern_analysis',
        href: '/app/ml/aiops/log_categorization_index_select',
      },
    ],
  },
];
