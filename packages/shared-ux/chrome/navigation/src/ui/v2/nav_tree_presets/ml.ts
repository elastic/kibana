/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NodeDefinition } from '../types';

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

export const ml: NodeDefinition<ID> = {
  id: 'sharedux:ml',
  title: 'Machine learning',
  icon: 'indexMapping',
  children: [
    {
      title: '',
      id: 'root',
      children: [
        {
          title: 'Overview',
          id: 'overview',
        },
        {
          title: 'Notifications',
          id: 'notifications',
        },
      ],
    },
    {
      title: 'Anomaly detection',
      id: 'anomaly_detection',
      children: [
        {
          title: 'Jobs',
          id: 'jobs',
        },
        {
          title: 'Anomaly explorer',
          id: 'explorer',
        },
        {
          title: 'Single metric viewer',
          id: 'single_metric_viewer',
        },
        {
          title: 'Settings',
          id: 'settings',
        },
      ],
    },
    {
      title: 'Data frame analytics',
      id: 'data_frame_analytics',
      children: [
        {
          title: 'Jobs',
          id: 'jobs',
        },
        {
          title: 'Results explorer',
          id: 'results_explorer',
        },
        {
          title: 'Analytics map',
          id: 'analytics_map',
        },
      ],
    },
    {
      title: 'Model management',
      id: 'model_management',
      children: [
        {
          title: 'Trained models',
          id: 'trained_models',
        },
        {
          title: 'Nodes',
          id: 'nodes',
        },
      ],
    },
    {
      title: 'Data visualizer',
      id: 'data_visualizer',
      children: [
        {
          title: 'File',
          id: 'file',
        },
        {
          title: 'Data view',
          id: 'data_view',
        },
      ],
    },
    {
      title: 'AIOps labs',
      id: 'aiops_labs',
      children: [
        {
          title: 'Explain log rate spikes',
          id: 'explain_log_rate_spikes',
        },
        {
          title: 'Log pattern analysis',
          id: 'log_pattern_analysis',
        },
      ],
    },
  ],
};
