/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NodeDefinition } from '../types';

export const ml: NodeDefinition = {
  id: 'ml',
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
