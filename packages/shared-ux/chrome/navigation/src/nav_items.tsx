/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const navItems = {
  dataExploration: [
    {
      name: '',
      id: 'data_exploration_root',
      items: [
        { name: 'Discover', id: 'discover' },
        { name: 'Dashboard', id: 'dashboard' },
        { name: 'Visualize Library', id: 'visualize_library' },
      ],
    },
  ],
  machineLearning: [
    {
      name: '',
      id: 'ml_root',
      items: [
        { name: 'Overview', id: 'ml_overview' },
        { name: 'Notifications', id: 'ml_notifications' },
      ],
    },
    {
      name: 'Anomaly detection',
      id: 'anomaly_detection',
      items: [
        { name: 'Jobs', id: 'ml_anomaly_detection_jobs' },
        { name: 'Anomaly explorer', id: 'ml_anomaly_explorer' },
        { name: 'Single metric viewer', id: 'ml_single_metric_viewer' },
        { name: 'Settings', id: 'ml_settings' },
      ],
    },
    {
      name: 'Data frame analytics',
      id: 'data_frame_analytics',
      items: [
        { name: 'Jobs', id: 'ml_data_frame_analytics_jobs' },
        { name: 'Results explorer', id: 'ml_results_explorer' },
        { name: 'Analytics map', id: 'ml_analytics_map' },
      ],
    },
    {
      name: 'Model management',
      id: 'model_management',
      items: [
        { name: 'Trained models', id: 'ml_trained_models' },
        { name: 'Nodes', id: 'ml_nodes' },
      ],
    },
    {
      name: 'Data visualizer',
      id: 'data_visualizer',
      items: [
        { name: 'File', id: 'file' },
        { name: 'Data view', id: 'data_view' },
      ],
    },
    {
      name: 'AIOps labs',
      id: 'aiops_labs',
      items: [
        { name: 'Explain log rate spikes', id: 'explain_log_rate_spikes' },
        { name: 'Log pattern analysis', id: 'log_pattern_analysis' },
      ],
    },
  ],
  devTools: [
    {
      name: '',
      id: 'devtools_root',
      items: [
        { name: 'Console', id: 'console' },
        { name: 'Search profiler', id: 'search_profiler' },
        { name: 'Grok debugger', id: 'grok_debugger' },
        { name: 'Painless lab', id: 'painless_lab' },
      ],
    },
  ],
  management: [
    {
      name: 'Ingest',
      id: 'management_ingest',
      items: [
        { name: 'Ingest Pipelines', id: 'management_ingest_pipelines' },
        { name: 'Logstash Pipelines', id: 'management_logstash_pipelines' },
      ],
    },
  ],
};
