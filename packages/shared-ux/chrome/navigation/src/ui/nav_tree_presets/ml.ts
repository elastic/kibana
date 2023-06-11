/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { NodeDefinitionWithChildren } from '.';

export type ID =
  | 'sharedux:ml'
  | 'root'
  | 'overview'
  | 'notifications'
  | 'anomaly_detection'
  | 'jobs'
  | 'explorer'
  | 'single_metric_viewer'
  | 'settings'
  | 'data_frame_analytics'
  | 'results_explorer'
  | 'analytics_map'
  | 'model_management'
  | 'trained_models'
  | 'nodes'
  | 'data_visualizer'
  | 'file'
  | 'data_view'
  | 'aiops_labs'
  | 'explain_log_rate_spikes'
  | 'log_pattern_analysis';

export const ml: NodeDefinitionWithChildren<ID> = {
  id: 'sharedux:ml',
  title: 'Machine learning',
  icon: 'indexMapping',
  children: [
    {
      title: '',
      id: 'root',
      children: [
        {
          id: 'overview',
          title: 'Overview',
          href: '/app/ml/overview',
        },
        {
          id: 'notifications',
          title: 'Notifications',
          href: '/app/ml/notifications',
        },
      ],
    },
    {
      title: 'Anomaly detection',
      id: 'anomaly_detection',
      children: [
        {
          id: 'jobs',
          title: 'Jobs',
          href: '/app/ml/jobs',
        },
        {
          id: 'explorer',
          title: 'Anomaly explorer',
          href: '/app/ml/explorer',
        },
        {
          id: 'single_metric_viewer',
          title: 'Single metric viewer',
          href: '/app/ml/timeseriesexplorer',
        },
        {
          id: 'settings',
          title: 'Settings',
          href: '/app/ml/settings',
        },
      ],
    },
    {
      id: 'data_frame_analytics',
      title: 'Data frame analytics',
      children: [
        {
          id: 'jobs',
          title: 'Jobs',
          href: '/app/ml/data_frame_analytics',
        },
        {
          id: 'results_explorer',
          title: 'Results explorer',
          href: '/app/ml/data_frame_analytics/exploration',
        },
        {
          id: 'analytics_map',
          title: 'Analytics map',
          href: '/app/ml/data_frame_analytics/map',
        },
      ],
    },
    {
      id: 'model_management',
      title: 'Model management',
      children: [
        {
          id: 'trained_models',
          title: 'Trained models',
          href: '/app/ml/trained_models',
        },
        {
          id: 'nodes',
          title: 'Nodes',
          href: '/app/ml/nodes',
        },
      ],
    },
    {
      id: 'data_visualizer',
      title: 'Data visualizer',
      children: [
        {
          id: 'file',
          title: 'File',
          href: '/app/ml/filedatavisualizer',
        },
        {
          id: 'data_view',
          title: 'Data view',
          href: '/app/ml/datavisualizer_index_select',
        },
      ],
    },
    {
      id: 'aiops_labs',
      title: 'AIOps labs',
      children: [
        {
          id: 'explain_log_rate_spikes',
          title: 'Explain log rate spikes',
          href: '/app/ml/aiops/explain_log_rate_spikes_index_select',
        },
        {
          id: 'log_pattern_analysis',
          title: 'Log pattern analysis',
          href: '/app/ml/aiops/log_categorization_index_select',
        },
      ],
    },
  ],
};
