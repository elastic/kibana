/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavItemProps } from '../../../types';
import { locators } from './_locators';

export const mlItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Overview',
        id: 'overview',
        ...locators.ml({ page: 'overview' }),
      },
      {
        name: 'Notifications',
        id: 'notifications',
        ...locators.ml({ page: 'notifications' }),
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
        ...locators.ml({ page: 'jobs' }),
      },
      {
        name: 'Anomaly explorer',
        id: 'explorer',
        ...locators.ml({ page: 'explorer' }),
      },
      {
        name: 'Single metric viewer',
        id: 'single_metric_viewer',
        ...locators.ml({ page: 'timeseriesexplorer' }),
      },
      {
        name: 'Settings',
        id: 'settings',
        ...locators.ml({ page: 'settings' }),
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
        ...locators.ml({ page: 'data_frame_analytics' }),
      },
      {
        name: 'Results explorer',
        id: 'results_explorer',
        ...locators.ml({ page: 'data_frame_analytics/exploration' }),
      },
      {
        name: 'Analytics map',
        id: 'analytics_map',
        ...locators.ml({ page: 'data_frame_analytics/map' }),
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
        ...locators.ml({ page: 'trained_models' }),
      },
      {
        name: 'Nodes',
        id: 'nodes',
        ...locators.unknown({ page: 'nodes' }),
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
        ...locators.ml({ page: 'filedatavisualizer' }),
      },
      {
        name: 'Data page',
        id: 'data_view',
        ...locators.ml({ page: 'datavisualizer_index_select' }),
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
        ...locators.ml({ page: 'explain_log_rate_spikes_index_select' }),
      },
      {
        name: 'Log pattern analysis',
        id: 'log_pattern_analysis',
        ...locators.ml({ page: 'log_categorization_index_select' }),
      },
    ],
  },
];
