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
          title: 'Mocked discover',
          deepLink: {
            id: 'discover',
            title: 'Mocked discover',
            href: '/mocked/discover',
            baseUrl: '/mocked',
            url: 'http://mocked/discover',
          },
        },
        {
          id: 'dashboards',
          path: ['rootNav:analytics', 'root', 'dashboards'],
          title: 'Mocked dashboards',
          deepLink: {
            id: 'dashboards',
            title: 'Mocked dashboards',
            href: '/mocked/dashboards',
            baseUrl: '/mocked',
            url: 'http://mocked/dashboards',
          },
        },
        {
          id: 'visualize',
          path: ['rootNav:analytics', 'root', 'visualize'],
          title: 'Mocked visualize',
          deepLink: {
            id: 'visualize',
            title: 'Mocked visualize',
            href: '/mocked/visualize',
            baseUrl: '/mocked',
            url: 'http://mocked/visualize',
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
          title: 'Mocked ml:overview',
          deepLink: {
            id: 'ml:overview',
            title: 'Mocked ml:overview',
            href: '/mocked/ml:overview',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:overview',
          },
        },
        {
          id: 'ml:notifications',
          path: ['rootNav:ml', 'root', 'ml:notifications'],
          title: 'Mocked ml:notifications',
          deepLink: {
            id: 'ml:notifications',
            title: 'Mocked ml:notifications',
            href: '/mocked/ml:notifications',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:notifications',
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
            title: 'Mocked ml:anomalyDetection',
            href: '/mocked/ml:anomalyDetection',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:anomalyDetection',
          },
        },
        {
          id: 'ml:anomalyExplorer',
          path: ['rootNav:ml', 'anomaly_detection', 'ml:anomalyExplorer'],
          title: 'Mocked ml:anomalyExplorer',
          deepLink: {
            id: 'ml:anomalyExplorer',
            title: 'Mocked ml:anomalyExplorer',
            href: '/mocked/ml:anomalyExplorer',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:anomalyExplorer',
          },
        },
        {
          id: 'ml:singleMetricViewer',
          path: ['rootNav:ml', 'anomaly_detection', 'ml:singleMetricViewer'],
          title: 'Mocked ml:singleMetricViewer',
          deepLink: {
            id: 'ml:singleMetricViewer',
            title: 'Mocked ml:singleMetricViewer',
            href: '/mocked/ml:singleMetricViewer',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:singleMetricViewer',
          },
        },
        {
          id: 'ml:settings',
          path: ['rootNav:ml', 'anomaly_detection', 'ml:settings'],
          title: 'Mocked ml:settings',
          deepLink: {
            id: 'ml:settings',
            title: 'Mocked ml:settings',
            href: '/mocked/ml:settings',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:settings',
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
            title: 'Mocked ml:dataFrameAnalytics',
            href: '/mocked/ml:dataFrameAnalytics',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:dataFrameAnalytics',
          },
        },
        {
          id: 'ml:resultExplorer',
          path: ['rootNav:ml', 'data_frame_analytics', 'ml:resultExplorer'],
          title: 'Mocked ml:resultExplorer',
          deepLink: {
            id: 'ml:resultExplorer',
            title: 'Mocked ml:resultExplorer',
            href: '/mocked/ml:resultExplorer',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:resultExplorer',
          },
        },
        {
          id: 'ml:analyticsMap',
          path: ['rootNav:ml', 'data_frame_analytics', 'ml:analyticsMap'],
          title: 'Mocked ml:analyticsMap',
          deepLink: {
            id: 'ml:analyticsMap',
            title: 'Mocked ml:analyticsMap',
            href: '/mocked/ml:analyticsMap',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:analyticsMap',
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
          title: 'Mocked ml:nodesOverview',
          deepLink: {
            id: 'ml:nodesOverview',
            title: 'Mocked ml:nodesOverview',
            href: '/mocked/ml:nodesOverview',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:nodesOverview',
          },
        },
        {
          id: 'ml:nodes',
          path: ['rootNav:ml', 'model_management', 'ml:nodes'],
          title: 'Mocked ml:nodes',
          deepLink: {
            id: 'ml:nodes',
            title: 'Mocked ml:nodes',
            href: '/mocked/ml:nodes',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:nodes',
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
            title: 'Mocked ml:fileUpload',
            href: '/mocked/ml:fileUpload',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:fileUpload',
          },
        },
        {
          title: 'Data view',
          id: 'ml:indexDataVisualizer',
          path: ['rootNav:ml', 'data_visualizer', 'ml:indexDataVisualizer'],
          deepLink: {
            id: 'ml:indexDataVisualizer',
            title: 'Mocked ml:indexDataVisualizer',
            href: '/mocked/ml:indexDataVisualizer',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:indexDataVisualizer',
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
            title: 'Mocked ml:explainLogRateSpikes',
            href: '/mocked/ml:explainLogRateSpikes',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:explainLogRateSpikes',
          },
        },
        {
          id: 'ml:logPatternAnalysis',
          path: ['rootNav:ml', 'aiops_labs', 'ml:logPatternAnalysis'],
          title: 'Mocked ml:logPatternAnalysis',
          deepLink: {
            id: 'ml:logPatternAnalysis',
            title: 'Mocked ml:logPatternAnalysis',
            href: '/mocked/ml:logPatternAnalysis',
            baseUrl: '/mocked',
            url: 'http://mocked/ml:logPatternAnalysis',
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
          title: 'Mocked dev_tools:console',
          deepLink: {
            id: 'dev_tools:console',
            title: 'Mocked dev_tools:console',
            href: '/mocked/dev_tools:console',
            baseUrl: '/mocked',
            url: 'http://mocked/dev_tools:console',
          },
        },
        {
          id: 'dev_tools:searchprofiler',
          path: ['rootNav:devtools', 'root', 'dev_tools:searchprofiler'],
          title: 'Mocked dev_tools:searchprofiler',
          deepLink: {
            id: 'dev_tools:searchprofiler',
            title: 'Mocked dev_tools:searchprofiler',
            href: '/mocked/dev_tools:searchprofiler',
            baseUrl: '/mocked',
            url: 'http://mocked/dev_tools:searchprofiler',
          },
        },
        {
          id: 'dev_tools:grokdebugger',
          path: ['rootNav:devtools', 'root', 'dev_tools:grokdebugger'],
          title: 'Mocked dev_tools:grokdebugger',
          deepLink: {
            id: 'dev_tools:grokdebugger',
            title: 'Mocked dev_tools:grokdebugger',
            href: '/mocked/dev_tools:grokdebugger',
            baseUrl: '/mocked',
            url: 'http://mocked/dev_tools:grokdebugger',
          },
        },
        {
          id: 'dev_tools:painless_lab',
          path: ['rootNav:devtools', 'root', 'dev_tools:painless_lab'],
          title: 'Mocked dev_tools:painless_lab',
          deepLink: {
            id: 'dev_tools:painless_lab',
            title: 'Mocked dev_tools:painless_lab',
            href: '/mocked/dev_tools:painless_lab',
            baseUrl: '/mocked',
            url: 'http://mocked/dev_tools:painless_lab',
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
          title: 'Mocked monitoring',
          deepLink: {
            id: 'monitoring',
            title: 'Mocked monitoring',
            href: '/mocked/monitoring',
            baseUrl: '/mocked',
            url: 'http://mocked/monitoring',
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
          title: 'Mocked integrations',
          deepLink: {
            id: 'integrations',
            title: 'Mocked integrations',
            href: '/mocked/integrations',
            baseUrl: '/mocked',
            url: 'http://mocked/integrations',
          },
        },
        {
          id: 'fleet',
          path: ['rootNav:management', 'integration_management', 'fleet'],
          title: 'Mocked fleet',
          deepLink: {
            id: 'fleet',
            title: 'Mocked fleet',
            href: '/mocked/fleet',
            baseUrl: '/mocked',
            url: 'http://mocked/fleet',
          },
        },
        {
          id: 'osquery',
          path: ['rootNav:management', 'integration_management', 'osquery'],
          title: 'Mocked osquery',
          deepLink: {
            id: 'osquery',
            title: 'Mocked osquery',
            href: '/mocked/osquery',
            baseUrl: '/mocked',
            url: 'http://mocked/osquery',
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
              title: 'Mocked management:ingest_pipelines',
              deepLink: {
                id: 'management:ingest_pipelines',
                title: 'Mocked management:ingest_pipelines',
                href: '/mocked/management:ingest_pipelines',
                baseUrl: '/mocked',
                url: 'http://mocked/management:ingest_pipelines',
              },
            },
            {
              id: 'management:pipelines',
              path: ['rootNav:management', 'stack_management', 'ingest', 'management:pipelines'],
              title: 'Mocked management:pipelines',
              deepLink: {
                id: 'management:pipelines',
                title: 'Mocked management:pipelines',
                href: '/mocked/management:pipelines',
                baseUrl: '/mocked',
                url: 'http://mocked/management:pipelines',
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
              title: 'Mocked management:index_management',
              deepLink: {
                id: 'management:index_management',
                title: 'Mocked management:index_management',
                href: '/mocked/management:index_management',
                baseUrl: '/mocked',
                url: 'http://mocked/management:index_management',
              },
            },
            {
              id: 'management:transform',
              path: ['rootNav:management', 'stack_management', 'data', 'management:transform'],
              title: 'Mocked management:transform',
              deepLink: {
                id: 'management:transform',
                title: 'Mocked management:transform',
                href: '/mocked/management:transform',
                baseUrl: '/mocked',
                url: 'http://mocked/management:transform',
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
              title: 'Mocked management:triggersActions',
              deepLink: {
                id: 'management:triggersActions',
                title: 'Mocked management:triggersActions',
                href: '/mocked/management:triggersActions',
                baseUrl: '/mocked',
                url: 'http://mocked/management:triggersActions',
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
              title: 'Mocked management:cases',
              deepLink: {
                id: 'management:cases',
                title: 'Mocked management:cases',
                href: '/mocked/management:cases',
                baseUrl: '/mocked',
                url: 'http://mocked/management:cases',
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
              title: 'Mocked management:triggersActionsConnectors',
              deepLink: {
                id: 'management:triggersActionsConnectors',
                title: 'Mocked management:triggersActionsConnectors',
                href: '/mocked/management:triggersActionsConnectors',
                baseUrl: '/mocked',
                url: 'http://mocked/management:triggersActionsConnectors',
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
              title: 'Mocked management:jobsListLink',
              deepLink: {
                id: 'management:jobsListLink',
                title: 'Mocked management:jobsListLink',
                href: '/mocked/management:jobsListLink',
                baseUrl: '/mocked',
                url: 'http://mocked/management:jobsListLink',
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
              title: 'Mocked management:dataViews',
              deepLink: {
                id: 'management:dataViews',
                title: 'Mocked management:dataViews',
                href: '/mocked/management:dataViews',
                baseUrl: '/mocked',
                url: 'http://mocked/management:dataViews',
              },
            },
            {
              id: 'management:objects',
              path: ['rootNav:management', 'stack_management', 'kibana', 'management:objects'],
              title: 'Mocked management:objects',
              deepLink: {
                id: 'management:objects',
                title: 'Mocked management:objects',
                href: '/mocked/management:objects',
                baseUrl: '/mocked',
                url: 'http://mocked/management:objects',
              },
            },
            {
              id: 'management:tags',
              path: ['rootNav:management', 'stack_management', 'kibana', 'management:tags'],
              title: 'Mocked management:tags',
              deepLink: {
                id: 'management:tags',
                title: 'Mocked management:tags',
                href: '/mocked/management:tags',
                baseUrl: '/mocked',
                url: 'http://mocked/management:tags',
              },
            },
            {
              id: 'management:spaces',
              path: ['rootNav:management', 'stack_management', 'kibana', 'management:spaces'],
              title: 'Mocked management:spaces',
              deepLink: {
                id: 'management:spaces',
                title: 'Mocked management:spaces',
                href: '/mocked/management:spaces',
                baseUrl: '/mocked',
                url: 'http://mocked/management:spaces',
              },
            },
            {
              id: 'management:settings',
              path: ['rootNav:management', 'stack_management', 'kibana', 'management:settings'],
              title: 'Mocked management:settings',
              deepLink: {
                id: 'management:settings',
                title: 'Mocked management:settings',
                href: '/mocked/management:settings',
                baseUrl: '/mocked',
                url: 'http://mocked/management:settings',
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
