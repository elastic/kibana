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
  id: 'rootNav:analytics',
  title: 'Data exploration',
  icon: 'stats',
  path: ['rootNav:analytics'],
  children: [
    {
      id: 'root',
      path: ['rootNav:analytics', 'root'],
      title: '',
      children: [
        {
          id: 'discover',
          path: ['rootNav:analytics', 'root', 'discover'],
          title: 'Deeplink discover',
          deepLink: {
            id: 'discover',
            title: 'Deeplink discover',
            href: 'http://mocked/discover',
            baseUrl: '/mocked',
            url: '/mocked/discover',
          },
        },
        {
          id: 'dashboards',
          path: ['rootNav:analytics', 'root', 'dashboards'],
          title: 'Deeplink dashboards',
          deepLink: {
            id: 'dashboards',
            title: 'Deeplink dashboards',
            href: 'http://mocked/dashboards',
            baseUrl: '/mocked',
            url: '/mocked/dashboards',
          },
        },
        {
          id: 'visualize',
          path: ['rootNav:analytics', 'root', 'visualize'],
          title: 'Deeplink visualize',
          deepLink: {
            id: 'visualize',
            title: 'Deeplink visualize',
            href: 'http://mocked/visualize',
            baseUrl: '/mocked',
            url: '/mocked/visualize',
          },
        },
      ],
    },
  ],
};

export const defaultMlNavGroup = {
  id: 'rootNav:ml',
  title: 'Machine learning',
  icon: 'indexMapping',
  path: ['rootNav:ml'],
  children: [
    {
      title: '',
      id: 'root',
      path: ['rootNav:ml', 'root'],
      children: [
        {
          id: 'ml:overview',
          path: ['rootNav:ml', 'root', 'ml:overview'],
          title: 'Deeplink ml:overview',
          deepLink: {
            id: 'ml:overview',
            title: 'Deeplink ml:overview',
            href: 'http://mocked/ml:overview',
            baseUrl: '/mocked',
            url: '/mocked/ml:overview',
          },
        },
        {
          id: 'ml:notifications',
          path: ['rootNav:ml', 'root', 'ml:notifications'],
          title: 'Deeplink ml:notifications',
          deepLink: {
            id: 'ml:notifications',
            title: 'Deeplink ml:notifications',
            href: 'http://mocked/ml:notifications',
            baseUrl: '/mocked',
            url: '/mocked/ml:notifications',
          },
        },
      ],
    },
    {
      title: 'Anomaly Detection',
      id: 'anomaly_detection',
      path: ['rootNav:ml', 'anomaly_detection'],
      children: [
        {
          title: 'Jobs',
          id: 'ml:anomalyDetection',
          path: ['rootNav:ml', 'anomaly_detection', 'ml:anomalyDetection'],
          deepLink: {
            id: 'ml:anomalyDetection',
            title: 'Deeplink ml:anomalyDetection',
            href: 'http://mocked/ml:anomalyDetection',
            baseUrl: '/mocked',
            url: '/mocked/ml:anomalyDetection',
          },
        },
        {
          id: 'ml:anomalyExplorer',
          path: ['rootNav:ml', 'anomaly_detection', 'ml:anomalyExplorer'],
          title: 'Deeplink ml:anomalyExplorer',
          deepLink: {
            id: 'ml:anomalyExplorer',
            title: 'Deeplink ml:anomalyExplorer',
            href: 'http://mocked/ml:anomalyExplorer',
            baseUrl: '/mocked',
            url: '/mocked/ml:anomalyExplorer',
          },
        },
        {
          id: 'ml:singleMetricViewer',
          path: ['rootNav:ml', 'anomaly_detection', 'ml:singleMetricViewer'],
          title: 'Deeplink ml:singleMetricViewer',
          deepLink: {
            id: 'ml:singleMetricViewer',
            title: 'Deeplink ml:singleMetricViewer',
            href: 'http://mocked/ml:singleMetricViewer',
            baseUrl: '/mocked',
            url: '/mocked/ml:singleMetricViewer',
          },
        },
        {
          id: 'ml:settings',
          path: ['rootNav:ml', 'anomaly_detection', 'ml:settings'],
          title: 'Deeplink ml:settings',
          deepLink: {
            id: 'ml:settings',
            title: 'Deeplink ml:settings',
            href: 'http://mocked/ml:settings',
            baseUrl: '/mocked',
            url: '/mocked/ml:settings',
          },
        },
      ],
    },
    {
      id: 'data_frame_analytics',
      title: 'Data frame analytics',
      path: ['rootNav:ml', 'data_frame_analytics'],
      children: [
        {
          title: 'Jobs',
          id: 'ml:dataFrameAnalytics',
          path: ['rootNav:ml', 'data_frame_analytics', 'ml:dataFrameAnalytics'],
          deepLink: {
            id: 'ml:dataFrameAnalytics',
            title: 'Deeplink ml:dataFrameAnalytics',
            href: 'http://mocked/ml:dataFrameAnalytics',
            baseUrl: '/mocked',
            url: '/mocked/ml:dataFrameAnalytics',
          },
        },
        {
          id: 'ml:resultExplorer',
          path: ['rootNav:ml', 'data_frame_analytics', 'ml:resultExplorer'],
          title: 'Deeplink ml:resultExplorer',
          deepLink: {
            id: 'ml:resultExplorer',
            title: 'Deeplink ml:resultExplorer',
            href: 'http://mocked/ml:resultExplorer',
            baseUrl: '/mocked',
            url: '/mocked/ml:resultExplorer',
          },
        },
        {
          id: 'ml:analyticsMap',
          path: ['rootNav:ml', 'data_frame_analytics', 'ml:analyticsMap'],
          title: 'Deeplink ml:analyticsMap',
          deepLink: {
            id: 'ml:analyticsMap',
            title: 'Deeplink ml:analyticsMap',
            href: 'http://mocked/ml:analyticsMap',
            baseUrl: '/mocked',
            url: '/mocked/ml:analyticsMap',
          },
        },
      ],
    },
    {
      id: 'model_management',
      title: 'Model management',
      path: ['rootNav:ml', 'model_management'],
      children: [
        {
          id: 'ml:nodesOverview',
          path: ['rootNav:ml', 'model_management', 'ml:nodesOverview'],
          title: 'Deeplink ml:nodesOverview',
          deepLink: {
            id: 'ml:nodesOverview',
            title: 'Deeplink ml:nodesOverview',
            href: 'http://mocked/ml:nodesOverview',
            baseUrl: '/mocked',
            url: '/mocked/ml:nodesOverview',
          },
        },
        {
          id: 'ml:nodes',
          path: ['rootNav:ml', 'model_management', 'ml:nodes'],
          title: 'Deeplink ml:nodes',
          deepLink: {
            id: 'ml:nodes',
            title: 'Deeplink ml:nodes',
            href: 'http://mocked/ml:nodes',
            baseUrl: '/mocked',
            url: '/mocked/ml:nodes',
          },
        },
      ],
    },
    {
      id: 'data_visualizer',
      title: 'Data visualizer',
      path: ['rootNav:ml', 'data_visualizer'],
      children: [
        {
          title: 'File',
          id: 'ml:fileUpload',
          path: ['rootNav:ml', 'data_visualizer', 'ml:fileUpload'],
          deepLink: {
            id: 'ml:fileUpload',
            title: 'Deeplink ml:fileUpload',
            href: 'http://mocked/ml:fileUpload',
            baseUrl: '/mocked',
            url: '/mocked/ml:fileUpload',
          },
        },
        {
          title: 'Data view',
          id: 'ml:indexDataVisualizer',
          path: ['rootNav:ml', 'data_visualizer', 'ml:indexDataVisualizer'],
          deepLink: {
            id: 'ml:indexDataVisualizer',
            title: 'Deeplink ml:indexDataVisualizer',
            href: 'http://mocked/ml:indexDataVisualizer',
            baseUrl: '/mocked',
            url: '/mocked/ml:indexDataVisualizer',
          },
        },
      ],
    },
    {
      id: 'aiops_labs',
      title: 'AIOps labs',
      path: ['rootNav:ml', 'aiops_labs'],
      children: [
        {
          title: 'Explain log rate spikes',
          id: 'ml:explainLogRateSpikes',
          path: ['rootNav:ml', 'aiops_labs', 'ml:explainLogRateSpikes'],
          deepLink: {
            id: 'ml:explainLogRateSpikes',
            title: 'Deeplink ml:explainLogRateSpikes',
            href: 'http://mocked/ml:explainLogRateSpikes',
            baseUrl: '/mocked',
            url: '/mocked/ml:explainLogRateSpikes',
          },
        },
        {
          id: 'ml:logPatternAnalysis',
          path: ['rootNav:ml', 'aiops_labs', 'ml:logPatternAnalysis'],
          title: 'Deeplink ml:logPatternAnalysis',
          deepLink: {
            id: 'ml:logPatternAnalysis',
            title: 'Deeplink ml:logPatternAnalysis',
            href: 'http://mocked/ml:logPatternAnalysis',
            baseUrl: '/mocked',
            url: '/mocked/ml:logPatternAnalysis',
          },
        },
      ],
    },
  ],
};

export const defaultDevtoolsNavGroup = {
  title: 'Developer tools',
  id: 'rootNav:devtools',
  icon: 'editorCodeBlock',
  path: ['rootNav:devtools'],
  children: [
    {
      id: 'root',
      path: ['rootNav:devtools', 'root'],
      title: '',
      children: [
        {
          id: 'dev_tools:console',
          path: ['rootNav:devtools', 'root', 'dev_tools:console'],
          title: 'Deeplink dev_tools:console',
          deepLink: {
            id: 'dev_tools:console',
            title: 'Deeplink dev_tools:console',
            href: 'http://mocked/dev_tools:console',
            baseUrl: '/mocked',
            url: '/mocked/dev_tools:console',
          },
        },
        {
          id: 'dev_tools:searchprofiler',
          path: ['rootNav:devtools', 'root', 'dev_tools:searchprofiler'],
          title: 'Deeplink dev_tools:searchprofiler',
          deepLink: {
            id: 'dev_tools:searchprofiler',
            title: 'Deeplink dev_tools:searchprofiler',
            href: 'http://mocked/dev_tools:searchprofiler',
            baseUrl: '/mocked',
            url: '/mocked/dev_tools:searchprofiler',
          },
        },
        {
          id: 'dev_tools:grokdebugger',
          path: ['rootNav:devtools', 'root', 'dev_tools:grokdebugger'],
          title: 'Deeplink dev_tools:grokdebugger',
          deepLink: {
            id: 'dev_tools:grokdebugger',
            title: 'Deeplink dev_tools:grokdebugger',
            href: 'http://mocked/dev_tools:grokdebugger',
            baseUrl: '/mocked',
            url: '/mocked/dev_tools:grokdebugger',
          },
        },
        {
          id: 'dev_tools:painless_lab',
          path: ['rootNav:devtools', 'root', 'dev_tools:painless_lab'],
          title: 'Deeplink dev_tools:painless_lab',
          deepLink: {
            id: 'dev_tools:painless_lab',
            title: 'Deeplink dev_tools:painless_lab',
            href: 'http://mocked/dev_tools:painless_lab',
            baseUrl: '/mocked',
            url: '/mocked/dev_tools:painless_lab',
          },
        },
      ],
    },
  ],
};

export const defaultManagementNavGroup = {
  id: 'rootNav:management',
  title: 'Management',
  icon: 'gear',
  path: ['rootNav:management'],
  children: [
    {
      id: 'root',
      title: '',
      path: ['rootNav:management', 'root'],
      children: [
        {
          id: 'monitoring',
          path: ['rootNav:management', 'root', 'monitoring'],
          title: 'Deeplink monitoring',
          deepLink: {
            id: 'monitoring',
            title: 'Deeplink monitoring',
            href: 'http://mocked/monitoring',
            baseUrl: '/mocked',
            url: '/mocked/monitoring',
          },
        },
      ],
    },
    {
      id: 'integration_management',
      title: 'Integration management',
      path: ['rootNav:management', 'integration_management'],
      children: [
        {
          id: 'integrations',
          path: ['rootNav:management', 'integration_management', 'integrations'],
          title: 'Deeplink integrations',
          deepLink: {
            id: 'integrations',
            title: 'Deeplink integrations',
            href: 'http://mocked/integrations',
            baseUrl: '/mocked',
            url: '/mocked/integrations',
          },
        },
        {
          id: 'fleet',
          path: ['rootNav:management', 'integration_management', 'fleet'],
          title: 'Deeplink fleet',
          deepLink: {
            id: 'fleet',
            title: 'Deeplink fleet',
            href: 'http://mocked/fleet',
            baseUrl: '/mocked',
            url: '/mocked/fleet',
          },
        },
        {
          id: 'osquery',
          path: ['rootNav:management', 'integration_management', 'osquery'],
          title: 'Deeplink osquery',
          deepLink: {
            id: 'osquery',
            title: 'Deeplink osquery',
            href: 'http://mocked/osquery',
            baseUrl: '/mocked',
            url: '/mocked/osquery',
          },
        },
      ],
    },
    {
      id: 'stack_management',
      title: 'Stack management',
      path: ['rootNav:management', 'stack_management'],
      children: [
        {
          id: 'ingest',
          title: 'Ingest',
          path: ['rootNav:management', 'stack_management', 'ingest'],
          children: [
            {
              id: 'management:ingest_pipelines',
              path: [
                'rootNav:management',
                'stack_management',
                'ingest',
                'management:ingest_pipelines',
              ],
              title: 'Deeplink management:ingest_pipelines',
              deepLink: {
                id: 'management:ingest_pipelines',
                title: 'Deeplink management:ingest_pipelines',
                href: 'http://mocked/management:ingest_pipelines',
                baseUrl: '/mocked',
                url: '/mocked/management:ingest_pipelines',
              },
            },
            {
              id: 'management:pipelines',
              path: ['rootNav:management', 'stack_management', 'ingest', 'management:pipelines'],
              title: 'Deeplink management:pipelines',
              deepLink: {
                id: 'management:pipelines',
                title: 'Deeplink management:pipelines',
                href: 'http://mocked/management:pipelines',
                baseUrl: '/mocked',
                url: '/mocked/management:pipelines',
              },
            },
          ],
        },
        {
          id: 'data',
          title: 'Data',
          path: ['rootNav:management', 'stack_management', 'data'],
          children: [
            {
              id: 'management:index_management',
              path: [
                'rootNav:management',
                'stack_management',
                'data',
                'management:index_management',
              ],
              title: 'Deeplink management:index_management',
              deepLink: {
                id: 'management:index_management',
                title: 'Deeplink management:index_management',
                href: 'http://mocked/management:index_management',
                baseUrl: '/mocked',
                url: '/mocked/management:index_management',
              },
            },
            {
              id: 'management:transform',
              path: ['rootNav:management', 'stack_management', 'data', 'management:transform'],
              title: 'Deeplink management:transform',
              deepLink: {
                id: 'management:transform',
                title: 'Deeplink management:transform',
                href: 'http://mocked/management:transform',
                baseUrl: '/mocked',
                url: '/mocked/management:transform',
              },
            },
          ],
        },
        {
          id: 'alerts_and_insights',
          title: 'Alerts and insights',
          path: ['rootNav:management', 'stack_management', 'alerts_and_insights'],
          children: [
            {
              id: 'management:triggersActions',
              path: [
                'rootNav:management',
                'stack_management',
                'alerts_and_insights',
                'management:triggersActions',
              ],
              title: 'Deeplink management:triggersActions',
              deepLink: {
                id: 'management:triggersActions',
                title: 'Deeplink management:triggersActions',
                href: 'http://mocked/management:triggersActions',
                baseUrl: '/mocked',
                url: '/mocked/management:triggersActions',
              },
            },
            {
              id: 'management:cases',
              path: [
                'rootNav:management',
                'stack_management',
                'alerts_and_insights',
                'management:cases',
              ],
              title: 'Deeplink management:cases',
              deepLink: {
                id: 'management:cases',
                title: 'Deeplink management:cases',
                href: 'http://mocked/management:cases',
                baseUrl: '/mocked',
                url: '/mocked/management:cases',
              },
            },
            {
              id: 'management:triggersActionsConnectors',
              path: [
                'rootNav:management',
                'stack_management',
                'alerts_and_insights',
                'management:triggersActionsConnectors',
              ],
              title: 'Deeplink management:triggersActionsConnectors',
              deepLink: {
                id: 'management:triggersActionsConnectors',
                title: 'Deeplink management:triggersActionsConnectors',
                href: 'http://mocked/management:triggersActionsConnectors',
                baseUrl: '/mocked',
                url: '/mocked/management:triggersActionsConnectors',
              },
            },
            {
              id: 'management:jobsListLink',
              path: [
                'rootNav:management',
                'stack_management',
                'alerts_and_insights',
                'management:jobsListLink',
              ],
              title: 'Deeplink management:jobsListLink',
              deepLink: {
                id: 'management:jobsListLink',
                title: 'Deeplink management:jobsListLink',
                href: 'http://mocked/management:jobsListLink',
                baseUrl: '/mocked',
                url: '/mocked/management:jobsListLink',
              },
            },
          ],
        },
        {
          id: 'kibana',
          title: 'Kibana',
          path: ['rootNav:management', 'stack_management', 'kibana'],
          children: [
            {
              id: 'management:dataViews',
              path: ['rootNav:management', 'stack_management', 'kibana', 'management:dataViews'],
              title: 'Deeplink management:dataViews',
              deepLink: {
                id: 'management:dataViews',
                title: 'Deeplink management:dataViews',
                href: 'http://mocked/management:dataViews',
                baseUrl: '/mocked',
                url: '/mocked/management:dataViews',
              },
            },
            {
              id: 'management:objects',
              path: ['rootNav:management', 'stack_management', 'kibana', 'management:objects'],
              title: 'Deeplink management:objects',
              deepLink: {
                id: 'management:objects',
                title: 'Deeplink management:objects',
                href: 'http://mocked/management:objects',
                baseUrl: '/mocked',
                url: '/mocked/management:objects',
              },
            },
            {
              id: 'management:tags',
              path: ['rootNav:management', 'stack_management', 'kibana', 'management:tags'],
              title: 'Deeplink management:tags',
              deepLink: {
                id: 'management:tags',
                title: 'Deeplink management:tags',
                href: 'http://mocked/management:tags',
                baseUrl: '/mocked',
                url: '/mocked/management:tags',
              },
            },
            {
              id: 'management:spaces',
              path: ['rootNav:management', 'stack_management', 'kibana', 'management:spaces'],
              title: 'Deeplink management:spaces',
              deepLink: {
                id: 'management:spaces',
                title: 'Deeplink management:spaces',
                href: 'http://mocked/management:spaces',
                baseUrl: '/mocked',
                url: '/mocked/management:spaces',
              },
            },
            {
              id: 'management:settings',
              path: ['rootNav:management', 'stack_management', 'kibana', 'management:settings'],
              title: 'Deeplink management:settings',
              deepLink: {
                id: 'management:settings',
                title: 'Deeplink management:settings',
                href: 'http://mocked/management:settings',
                baseUrl: '/mocked',
                url: '/mocked/management:settings',
              },
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
