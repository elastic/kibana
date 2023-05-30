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

export const defaultAnalyticsNavGroup = {
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
          title: 'Discover',
          id: 'discover',
          href: '/app/discover',
          path: ['sharedux:analytics', 'root', 'discover'],
        },
        {
          title: 'Dashboard',
          id: 'dashboard',
          href: '/app/dashboards',
          path: ['sharedux:analytics', 'root', 'dashboard'],
        },
        {
          id: 'visualize_library',
          title: 'Visualize Library',
          href: '/app/visualize',
          path: ['sharedux:analytics', 'root', 'visualize_library'],
        },
      ],
    },
  ],
};

export const defaultMlNavGroup = {
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
          id: 'overview',
          title: 'Overview',
          href: '/app/ml/overview',
          path: ['sharedux:ml', 'root', 'overview'],
        },
        {
          id: 'notifications',
          title: 'Notifications',
          href: '/app/ml/notifications',
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
          id: 'jobs',
          title: 'Jobs',
          href: '/app/ml/jobs',
          path: ['sharedux:ml', 'anomaly_detection', 'jobs'],
        },
        {
          id: 'explorer',
          title: 'Anomaly explorer',
          href: '/app/ml/explorer',
          path: ['sharedux:ml', 'anomaly_detection', 'explorer'],
        },
        {
          id: 'single_metric_viewer',
          title: 'Single metric viewer',
          href: '/app/ml/timeseriesexplorer',
          path: ['sharedux:ml', 'anomaly_detection', 'single_metric_viewer'],
        },
        {
          id: 'settings',
          title: 'Settings',
          href: '/app/ml/settings',
          path: ['sharedux:ml', 'anomaly_detection', 'settings'],
        },
      ],
    },
    {
      id: 'data_frame_analytics',
      title: 'Data frame analytics',
      path: ['sharedux:ml', 'data_frame_analytics'],
      children: [
        {
          id: 'jobs',
          title: 'Jobs',
          href: '/app/ml/data_frame_analytics',
          path: ['sharedux:ml', 'data_frame_analytics', 'jobs'],
        },
        {
          id: 'results_explorer',
          title: 'Results explorer',
          href: '/app/ml/data_frame_analytics/exploration',
          path: ['sharedux:ml', 'data_frame_analytics', 'results_explorer'],
        },
        {
          id: 'analytics_map',
          title: 'Analytics map',
          href: '/app/ml/data_frame_analytics/map',
          path: ['sharedux:ml', 'data_frame_analytics', 'analytics_map'],
        },
      ],
    },
    {
      id: 'model_management',
      title: 'Model management',
      path: ['sharedux:ml', 'model_management'],
      children: [
        {
          id: 'trained_models',
          title: 'Trained models',
          href: '/app/ml/trained_models',
          path: ['sharedux:ml', 'model_management', 'trained_models'],
        },
        {
          id: 'nodes',
          title: 'Nodes',
          href: '/app/ml/nodes',
          path: ['sharedux:ml', 'model_management', 'nodes'],
        },
      ],
    },
    {
      id: 'data_visualizer',
      title: 'Data visualizer',
      path: ['sharedux:ml', 'data_visualizer'],
      children: [
        {
          id: 'file',
          title: 'File',
          href: '/app/ml/filedatavisualizer',
          path: ['sharedux:ml', 'data_visualizer', 'file'],
        },
        {
          id: 'data_view',
          title: 'Data view',
          href: '/app/ml/datavisualizer_index_select',
          path: ['sharedux:ml', 'data_visualizer', 'data_view'],
        },
      ],
    },
    {
      id: 'aiops_labs',
      title: 'AIOps labs',
      path: ['sharedux:ml', 'aiops_labs'],
      children: [
        {
          id: 'explain_log_rate_spikes',
          title: 'Explain log rate spikes',
          href: '/app/ml/aiops/explain_log_rate_spikes_index_select',
          path: ['sharedux:ml', 'aiops_labs', 'explain_log_rate_spikes'],
        },
        {
          id: 'log_pattern_analysis',
          title: 'Log pattern analysis',
          href: '/app/ml/aiops/log_categorization_index_select',
          path: ['sharedux:ml', 'aiops_labs', 'log_pattern_analysis'],
        },
      ],
    },
  ],
};

export const defaultDevtoolsNavGroup = {
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
          id: 'console',
          title: 'Console',
          href: '/app/dev_tools#/console',
          path: ['sharedux:devtools', 'root', 'console'],
        },
        {
          id: 'search_profiler',
          title: 'Search profiler',
          href: '/app/dev_tools#/searchprofiler',
          path: ['sharedux:devtools', 'root', 'search_profiler'],
        },
        {
          id: 'grok_debugger',
          title: 'Grok debugger',
          href: '/app/dev_tools#/grokdebugger',
          path: ['sharedux:devtools', 'root', 'grok_debugger'],
        },
        {
          id: 'painless_lab',
          title: 'Painless lab',
          href: '/app/dev_tools#/painless_lab',
          path: ['sharedux:devtools', 'root', 'painless_lab'],
        },
      ],
    },
  ],
};

export const defaultManagementNavGroup = {
  id: 'sharedux:management',
  title: 'Management',
  icon: 'gear',
  path: ['sharedux:management'],
  children: [
    {
      id: 'root',
      title: '',
      path: ['sharedux:management', 'root'],
      children: [
        {
          id: 'stack_monitoring',
          title: 'Stack monitoring',
          href: '/app/monitoring',
          path: ['sharedux:management', 'root', 'stack_monitoring'],
        },
      ],
    },
    {
      id: 'integration_management',
      title: 'Integration management',
      path: ['sharedux:management', 'integration_management'],
      children: [
        {
          id: 'integrations',
          title: 'Integrations',
          href: '/app/integrations',
          path: ['sharedux:management', 'integration_management', 'integrations'],
        },
        {
          id: 'fleet',
          title: 'Fleet',
          href: '/app/fleet',
          path: ['sharedux:management', 'integration_management', 'fleet'],
        },
        {
          id: 'osquery',
          title: 'Osquery',
          href: '/app/osquery',
          path: ['sharedux:management', 'integration_management', 'osquery'],
        },
      ],
    },
    {
      id: 'stack_management',
      title: 'Stack management',
      path: ['sharedux:management', 'stack_management'],
      children: [
        {
          id: 'upgrade_assistant',
          title: 'Upgrade assistant',
          href: '/app/management/stack/upgrade_assistant',
          path: ['sharedux:management', 'stack_management', 'upgrade_assistant'],
        },
        {
          id: 'ingest',
          title: 'Ingest',
          path: ['sharedux:management', 'stack_management', 'ingest'],
          children: [
            {
              id: 'ingest_pipelines',
              title: 'Ingest pipelines',
              href: '/app/management/ingest/ingest_pipelines',
              path: ['sharedux:management', 'stack_management', 'ingest', 'ingest_pipelines'],
            },
            {
              id: 'logstash_pipelines',
              title: 'Logstash pipelines',
              href: '/app/management/ingest/pipelines',
              path: ['sharedux:management', 'stack_management', 'ingest', 'logstash_pipelines'],
            },
          ],
        },
        {
          id: 'data',
          title: 'Data',
          path: ['sharedux:management', 'stack_management', 'data'],
          children: [
            {
              id: 'index_management',
              title: 'Index management',
              href: '/app/management/data/index_management',
              path: ['sharedux:management', 'stack_management', 'data', 'index_management'],
            },
            {
              id: 'index_lifecycle_policies',
              title: 'Index lifecycle policies',
              href: '/app/management/data/index_lifecycle_management',
              path: ['sharedux:management', 'stack_management', 'data', 'index_lifecycle_policies'],
            },
            {
              id: 'snapshot_and_restore',
              title: 'Snapshot and restore',
              href: 'app/management/data/snapshot_restore',
              path: ['sharedux:management', 'stack_management', 'data', 'snapshot_and_restore'],
            },
            {
              id: 'rollup_jobs',
              title: 'Rollup jobs',
              href: '/app/management/data/rollup_jobs',
              path: ['sharedux:management', 'stack_management', 'data', 'rollup_jobs'],
            },
            {
              id: 'transforms',
              title: 'Transforms',
              href: '/app/management/data/transform',
              path: ['sharedux:management', 'stack_management', 'data', 'transforms'],
            },
            {
              id: 'cross_cluster_replication',
              title: 'Cross-cluster replication',
              href: '/app/management/data/cross_cluster_replication',
              path: [
                'sharedux:management',
                'stack_management',
                'data',
                'cross_cluster_replication',
              ],
            },
            {
              id: 'remote_clusters',
              title: 'Remote clusters',
              href: '/app/management/data/remote_clusters',
              path: ['sharedux:management', 'stack_management', 'data', 'remote_clusters'],
            },
          ],
        },
        {
          id: 'alerts_and_insights',
          title: 'Alerts and insights',
          path: ['sharedux:management', 'stack_management', 'alerts_and_insights'],
          children: [
            {
              id: 'rules',
              title: 'Rules',
              href: '/app/management/insightsAndAlerting/triggersActions/rules',
              path: ['sharedux:management', 'stack_management', 'alerts_and_insights', 'rules'],
            },
            {
              id: 'cases',
              title: 'Cases',
              href: '/app/management/insightsAndAlerting/cases',
              path: ['sharedux:management', 'stack_management', 'alerts_and_insights', 'cases'],
            },
            {
              id: 'connectors',
              title: 'Connectors',
              href: '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors',
              path: [
                'sharedux:management',
                'stack_management',
                'alerts_and_insights',
                'connectors',
              ],
            },
            {
              id: 'reporting',
              title: 'Reporting',
              href: '/app/management/insightsAndAlerting/reporting',
              path: ['sharedux:management', 'stack_management', 'alerts_and_insights', 'reporting'],
            },
            {
              id: 'machine_learning',
              title: 'Machine learning',
              href: '/app/management/insightsAndAlerting/jobsListLink',
              path: [
                'sharedux:management',
                'stack_management',
                'alerts_and_insights',
                'machine_learning',
              ],
            },
            {
              id: 'watcher',
              title: 'Watcher',
              href: '/app/management/insightsAndAlerting/watcher',
              path: ['sharedux:management', 'stack_management', 'alerts_and_insights', 'watcher'],
            },
          ],
        },
        {
          id: 'security',
          title: 'Security',
          path: ['sharedux:management', 'stack_management', 'security'],
          children: [
            {
              id: 'users',
              title: 'Users',
              href: '/app/management/security/users',
              path: ['sharedux:management', 'stack_management', 'security', 'users'],
            },
            {
              id: 'roles',
              title: 'Roles',
              href: '/app/management/security/roles',
              path: ['sharedux:management', 'stack_management', 'security', 'roles'],
            },
            {
              id: 'role_mappings',
              title: 'Role mappings',
              href: '/app/management/security/role_mappings',
              path: ['sharedux:management', 'stack_management', 'security', 'role_mappings'],
            },
            {
              id: 'api_keys',
              title: 'API keys',
              href: '/app/management/security/api_keys',
              path: ['sharedux:management', 'stack_management', 'security', 'api_keys'],
            },
          ],
        },
        {
          id: 'kibana',
          title: 'Kibana',
          path: ['sharedux:management', 'stack_management', 'kibana'],
          children: [
            {
              id: 'data_views',
              title: 'Data view',
              href: '/app/management/kibana/dataViews',
              path: ['sharedux:management', 'stack_management', 'kibana', 'data_views'],
            },
            {
              id: 'saved_objects',
              title: 'Saved objects',
              href: '/app/management/kibana/objects',
              path: ['sharedux:management', 'stack_management', 'kibana', 'saved_objects'],
            },
            {
              id: 'tags',
              title: 'Tags',
              href: '/app/management/kibana/tags',
              path: ['sharedux:management', 'stack_management', 'kibana', 'tags'],
            },
            {
              id: 'search_sessions',
              title: 'Search sessions',
              href: '/app/management/kibana/search_sessions',
              path: ['sharedux:management', 'stack_management', 'kibana', 'search_sessions'],
            },
            {
              id: 'spaces',
              title: 'Spaces',
              href: '/app/management/kibana/spaces',
              path: ['sharedux:management', 'stack_management', 'kibana', 'spaces'],
            },
            {
              id: 'advanced_settings',
              title: 'Advanced settings',
              href: '/app/management/kibana/settings',
              path: ['sharedux:management', 'stack_management', 'kibana', 'advanced_settings'],
            },
          ],
        },
      ],
    },
  ],
};

export const defaultNavigationTree = [
  defaultAnalyticsNavGroup,
  defaultMlNavGroup,
  defaultDevtoolsNavGroup,
  defaultManagementNavGroup,
];
