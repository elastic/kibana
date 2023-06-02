/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This is the default navigation tree that is added to a project
 * when only a project navigation tree is provided.
 * NOTE: This will have to be updated once we add the deep link ids as each of the node
 * will contain the deep link information.
 */
export const defaultNavigationTree = [
  {
    type: 'navGroup',
    id: 'sharedux:analytics',
    title: 'Data exploration',
    icon: 'stats',
    path: ['sharedux:analytics'],
    children: [
      {
        id: 'root',
        path: ['sharedux:analytics', 'root'],
        title: '',
        children: [
          {
            id: 'discover',
            title: 'Discover',
            path: ['sharedux:analytics', 'root', 'discover'],
          },
          {
            id: 'dashboard',
            title: 'Dashboard',
            path: ['sharedux:analytics', 'root', 'dashboard'],
          },
          {
            id: 'visualize',
            title: 'Visualize library',
            path: ['sharedux:analytics', 'root', 'visualize'],
          },
        ],
      },
    ],
  },
  {
    type: 'navGroup',
    id: 'sharedux:ml',
    title: 'Machine learning',
    icon: 'indexMapping',
    path: ['sharedux:ml'],
    children: [
      {
        title: '',
        id: 'root',
        path: ['sharedux:ml', 'root'],
        children: [
          {
            title: 'Overview',
            id: 'overview',
            path: ['sharedux:ml', 'root', 'overview'],
          },
          {
            title: 'Notifications',
            id: 'notifications',
            path: ['sharedux:ml', 'root', 'notifications'],
          },
        ],
      },
      {
        title: 'Anomaly detection',
        id: 'anomaly_detection',
        path: ['sharedux:ml', 'anomaly_detection'],
        children: [
          {
            title: 'Jobs',
            id: 'jobs',
            path: ['sharedux:ml', 'anomaly_detection', 'jobs'],
          },
          {
            title: 'Anomaly explorer',
            id: 'explorer',
            path: ['sharedux:ml', 'anomaly_detection', 'explorer'],
          },
          {
            title: 'Single metric viewer',
            id: 'single_metric_viewer',
            path: ['sharedux:ml', 'anomaly_detection', 'single_metric_viewer'],
          },
          {
            title: 'Settings',
            id: 'settings',
            path: ['sharedux:ml', 'anomaly_detection', 'settings'],
          },
        ],
      },
      {
        title: 'Data frame analytics',
        id: 'data_frame_analytics',
        path: ['sharedux:ml', 'data_frame_analytics'],
        children: [
          {
            title: 'Jobs',
            id: 'jobs',
            path: ['sharedux:ml', 'data_frame_analytics', 'jobs'],
          },
          {
            title: 'Results explorer',
            id: 'results_explorer',
            path: ['sharedux:ml', 'data_frame_analytics', 'results_explorer'],
          },
          {
            title: 'Analytics map',
            id: 'analytics_map',
            path: ['sharedux:ml', 'data_frame_analytics', 'analytics_map'],
          },
        ],
      },
      {
        title: 'Model management',
        id: 'model_management',
        path: ['sharedux:ml', 'model_management'],
        children: [
          {
            title: 'Trained models',
            id: 'trained_models',
            path: ['sharedux:ml', 'model_management', 'trained_models'],
          },
          {
            title: 'Nodes',
            id: 'nodes',
            path: ['sharedux:ml', 'model_management', 'nodes'],
          },
        ],
      },
      {
        title: 'Data visualizer',
        id: 'data_visualizer',
        path: ['sharedux:ml', 'data_visualizer'],
        children: [
          {
            title: 'File',
            id: 'file',
            path: ['sharedux:ml', 'data_visualizer', 'file'],
          },
          {
            title: 'Data view',
            id: 'data_view',
            path: ['sharedux:ml', 'data_visualizer', 'data_view'],
          },
        ],
      },
      {
        title: 'AIOps labs',
        id: 'aiops_labs',
        path: ['sharedux:ml', 'aiops_labs'],
        children: [
          {
            title: 'Explain log rate spikes',
            id: 'explain_log_rate_spikes',
            path: ['sharedux:ml', 'aiops_labs', 'explain_log_rate_spikes'],
          },
          {
            title: 'Log pattern analysis',
            id: 'log_pattern_analysis',
            path: ['sharedux:ml', 'aiops_labs', 'log_pattern_analysis'],
          },
        ],
      },
    ],
  },
  {
    type: 'navGroup',
    title: 'Developer tools',
    id: 'sharedux:devtools',
    icon: 'editorCodeBlock',
    path: ['sharedux:devtools'],
    children: [
      {
        id: 'root',
        path: ['sharedux:devtools', 'root'],
        title: '',
        children: [
          {
            title: 'Console',
            id: 'console',
            path: ['sharedux:devtools', 'root', 'console'],
          },
          {
            title: 'Search profiler',
            id: 'search_profiler',
            path: ['sharedux:devtools', 'root', 'search_profiler'],
          },
          {
            title: 'Grok debugger',
            id: 'grok_debugger',
            path: ['sharedux:devtools', 'root', 'grok_debugger'],
          },
          {
            title: 'Painless lab',
            id: 'painless_lab',
            path: ['sharedux:devtools', 'root', 'painless_lab'],
          },
        ],
      },
    ],
  },
  {
    type: 'navGroup',
    id: 'sharedux:management',
    title: 'Management',
    icon: 'gear',
    path: ['sharedux:management'],
    children: [
      {
        title: '',
        id: 'root',
        path: ['sharedux:management', 'root'],
        children: [
          {
            title: 'Stack monitoring',
            id: 'stack_monitoring',
            path: ['sharedux:management', 'root', 'stack_monitoring'],
          },
        ],
      },
      {
        title: 'Integration management',
        id: 'integration_management',
        path: ['sharedux:management', 'integration_management'],
        children: [
          {
            title: 'Integrations',
            id: 'integrations',
            path: ['sharedux:management', 'integration_management', 'integrations'],
          },
          {
            title: 'Fleet',
            id: 'fleet',
            path: ['sharedux:management', 'integration_management', 'fleet'],
          },
          {
            title: 'Osquery',
            id: 'osquery',
            path: ['sharedux:management', 'integration_management', 'osquery'],
          },
        ],
      },
      {
        title: 'Stack management',
        id: 'stack_management',
        path: ['sharedux:management', 'stack_management'],
        children: [
          {
            title: 'Upgrade assistant',
            id: 'upgrade_assistant',
            path: ['sharedux:management', 'stack_management', 'upgrade_assistant'],
          },
          {
            title: 'Ingest',
            id: 'ingest',
            path: ['sharedux:management', 'stack_management', 'ingest'],
            children: [
              {
                title: 'Ingest pipelines',
                id: 'ingest_pipelines',
                path: ['sharedux:management', 'stack_management', 'ingest', 'ingest_pipelines'],
              },
              {
                title: 'Logstash pipelines',
                id: 'logstash_pipelines',
                path: ['sharedux:management', 'stack_management', 'ingest', 'logstash_pipelines'],
              },
            ],
          },
          {
            title: 'Data',
            id: 'data',
            path: ['sharedux:management', 'stack_management', 'data'],
            children: [
              {
                title: 'Index management',
                id: 'index_management',
                path: ['sharedux:management', 'stack_management', 'data', 'index_management'],
              },
              {
                title: 'Index lifecycle policies',
                id: 'index_lifecycle_policies',
                path: [
                  'sharedux:management',
                  'stack_management',
                  'data',
                  'index_lifecycle_policies',
                ],
              },
              {
                title: 'Snapshot and restore',
                id: 'snapshot_and_restore',
                path: ['sharedux:management', 'stack_management', 'data', 'snapshot_and_restore'],
              },
              {
                title: 'Rollup jobs',
                id: 'rollup_jobs',
                path: ['sharedux:management', 'stack_management', 'data', 'rollup_jobs'],
              },
              {
                title: 'Transforms',
                id: 'transforms',
                path: ['sharedux:management', 'stack_management', 'data', 'transforms'],
              },
              {
                title: 'Cross-cluster replication',
                id: 'cross_cluster_replication',
                path: [
                  'sharedux:management',
                  'stack_management',
                  'data',
                  'cross_cluster_replication',
                ],
              },
              {
                title: 'Remote clusters',
                id: 'remote_clusters',
                path: ['sharedux:management', 'stack_management', 'data', 'remote_clusters'],
              },
            ],
          },
          {
            title: 'Alerts and insights',
            id: 'alerts_and_insights',
            path: ['sharedux:management', 'stack_management', 'alerts_and_insights'],
            children: [
              {
                title: 'Rules',
                id: 'rules',
                path: ['sharedux:management', 'stack_management', 'alerts_and_insights', 'rules'],
              },
              {
                title: 'Cases',
                id: 'cases',
                path: ['sharedux:management', 'stack_management', 'alerts_and_insights', 'cases'],
              },
              {
                title: 'Connectors',
                id: 'connectors',
                path: [
                  'sharedux:management',
                  'stack_management',
                  'alerts_and_insights',
                  'connectors',
                ],
              },
              {
                title: 'Reporting',
                id: 'reporting',
                path: [
                  'sharedux:management',
                  'stack_management',
                  'alerts_and_insights',
                  'reporting',
                ],
              },
              {
                title: 'Machine learning',
                id: 'machine_learning',
                path: [
                  'sharedux:management',
                  'stack_management',
                  'alerts_and_insights',
                  'machine_learning',
                ],
              },
              {
                title: 'Watcher',
                id: 'watcher',
                path: ['sharedux:management', 'stack_management', 'alerts_and_insights', 'watcher'],
              },
            ],
          },
          {
            title: 'Security',
            id: 'security',
            path: ['sharedux:management', 'stack_management', 'security'],
            children: [
              {
                title: 'Users',
                id: 'users',
                path: ['sharedux:management', 'stack_management', 'security', 'users'],
              },
              {
                title: 'Roles',
                id: 'roles',
                path: ['sharedux:management', 'stack_management', 'security', 'roles'],
              },
              {
                title: 'Role mappings',
                id: 'role_mappings',
                path: ['sharedux:management', 'stack_management', 'security', 'role_mappings'],
              },
              {
                title: 'API keys',
                id: 'api_keys',
                path: ['sharedux:management', 'stack_management', 'security', 'api_keys'],
              },
            ],
          },
          {
            title: 'Kibana',
            id: 'kibana',
            path: ['sharedux:management', 'stack_management', 'kibana'],
            children: [
              {
                title: 'Data view',
                id: 'data_views',
                path: ['sharedux:management', 'stack_management', 'kibana', 'data_views'],
              },
              {
                title: 'Saved objects',
                id: 'saved_objects',
                path: ['sharedux:management', 'stack_management', 'kibana', 'saved_objects'],
              },
              {
                title: 'Tags',
                id: 'tags',
                path: ['sharedux:management', 'stack_management', 'kibana', 'tags'],
              },
              {
                title: 'Search sessions',
                id: 'search_sessions',
                path: ['sharedux:management', 'stack_management', 'kibana', 'search_sessions'],
              },
              {
                title: 'Spaces',
                id: 'spaces',
                path: ['sharedux:management', 'stack_management', 'kibana', 'spaces'],
              },
              {
                title: 'Advanced settings',
                id: 'advanced_settings',
                path: ['sharedux:management', 'stack_management', 'kibana', 'advanced_settings'],
              },
            ],
          },
        ],
      },
    ],
  },
];
