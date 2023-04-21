/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LocatorId } from '@kbn/shared-ux-locators';
import { NavItemProps } from '../../../types';

const { ML } = LocatorId;

export const mlItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Overview',
        id: 'overview',
        locator: { id: ML, params: { page: 'overview' } },
      },
      {
        name: 'Notifications',
        id: 'notifications',
        locator: { id: ML, params: { page: 'notifications' } },
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
        locator: { id: ML, params: { page: 'jobs' } },
      },
      {
        name: 'Anomaly explorer',
        id: 'explorer',
        locator: { id: ML, params: { page: 'explorer' } },
      },
      {
        name: 'Single metric viewer',
        id: 'single_metric_viewer',
        locator: { id: ML, params: { page: 'timeseriesexplorer' } },
      },
      {
        name: 'Settings',
        id: 'settings',
        locator: { id: ML, params: { page: 'settings' } },
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
        locator: { id: ML, params: { page: 'data_frame_analytics' } },
      },
      {
        name: 'Results explorer',
        id: 'results_explorer',
        locator: { id: ML, params: { page: 'data_frame_analytics/exploration' } },
      },
      {
        name: 'Analytics map',
        id: 'analytics_map',
        locator: { id: ML, params: { page: 'data_frame_analytics/map' } },
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
        locator: { id: ML, params: { page: 'trained_models' } },
      },
      {
        name: 'Nodes',
        id: 'nodes',
        locator: { id: ML, params: { page: 'nodes' } },
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
        locator: { id: ML, params: { page: 'filedatavisualizer' } },
      },
      {
        name: 'Data page',
        id: 'data_view',
        locator: { id: ML, params: { page: 'datavisualizer_index_select' } },
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
        locator: { id: ML, params: { page: 'explain_log_rate_spikes_index_select' } },
      },
      {
        name: 'Log pattern analysis',
        id: 'log_pattern_analysis',
        locator: { id: ML, params: { page: 'log_categorization_index_select' } },
      },
    ],
  },
];
