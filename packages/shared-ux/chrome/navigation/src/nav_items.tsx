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
        { name: 'Overview', id: 'ml_1' },
        { name: 'Notifications', id: 'ml_2' },
      ],
    },
    {
      name: 'Anomaly detection',
      id: 'anomaly_detection',
      items: [
        { name: 'Jobs', id: 'ml_1' },
        { name: 'Anomaly explorer', id: 'ml_2' },
        { name: 'Single metric viewer', id: 'ml_2' },
        { name: 'Settings', id: 'ml_2' },
      ],
    },
    {
      name: 'Data frame analytics',
      id: 'data_frame_analytics',
      items: [
        { name: 'Jobs', id: 'ml_1' },
        { name: 'Results explorer', id: 'ml_2' },
        { name: 'Analytics map', id: 'ml_2' },
      ],
    },
    {
      name: 'Model management',
      id: 'model_management',
      items: [
        { name: 'Trained models', id: 'ml_1' },
        { name: 'Nodes', id: 'ml_2' },
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
        { name: 'Ingest Pipelines', id: 'management_1' },
        { name: 'Logstash Pipelines', id: 'management_2' },
      ],
    },
    {
      name: 'Data',
      id: 'management_data',
      items: [
        { name: 'Index Management', id: 'management_1' },
        { name: 'Index Lifecycle Policies', id: 'management_2' },
        { name: 'Snapshot and Restore', id: 'management_2' },
        { name: 'Rollup Jobs', id: 'management_2' },
        { name: 'Transforms', id: 'management_2' },
        { name: 'Cross-Cluster Replication', id: 'management_2' },
        { name: 'Remote Clusters', id: 'management_2' },
        { name: 'Remote Clusters', id: 'management_2' },
      ],
    },
  ],
};
