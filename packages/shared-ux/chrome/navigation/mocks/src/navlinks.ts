/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AppDeepLinkId, ChromeNavLink } from '@kbn/core-chrome-browser';

const getNavLink = (id: string): ChromeNavLink => {
  return {
    id,
    title: `Deeplink ${id}`,
    href: `http://mocked/${id}`,
    baseUrl: `/mocked`,
    url: `/mocked/${id}`,
  };
};

const allNavLinks: AppDeepLinkId[] = [
  'dashboards',
  'dev_tools',
  'dev_tools:console',
  'dev_tools:grokdebugger',
  'dev_tools:painless_lab',
  'dev_tools:searchprofiler',
  'discover',
  'fleet',
  'integrations',
  'management',
  'management:api_keys',
  'management:cases',
  'management:cross_cluster_replication',
  'management:dataViews',
  'management:index_lifecycle_management',
  'management:index_management',
  'management:ingest_pipelines',
  'management:jobsListLink',
  'management:objects',
  'management:pipelines',
  'management:reporting',
  'management:rollup_jobs',
  'management:settings',
  'management:snapshot_restore',
  'management:spaces',
  'management:tags',
  'management:transform',
  'management:triggersActions',
  'management:triggersActionsConnectors',
  'management:watcher',
  'ml',
  'ml:aiOps',
  'ml:analyticsMap',
  'ml:anomalyDetection',
  'ml:anomalyExplorer',
  'ml:calendarSettings',
  'ml:calendarSettings',
  'ml:changePointDetections',
  'ml:dataFrameAnalytics',
  'ml:dataVisualizer',
  'ml:fileUpload',
  'ml:filterListsSettings',
  'ml:indexDataVisualizer',
  'ml:logPatternAnalysis',
  'ml:logRateAnalysis',
  'ml:memoryUsage',
  'ml:modelManagement',
  'ml:nodes',
  'ml:nodesOverview',
  'ml:notifications',
  'ml:overview',
  'ml:resultExplorer',
  'ml:settings',
  'ml:singleMetricViewer',
  'monitoring',
  'osquery',
  'serverlessElasticsearch',
  'visualize',
];

export const navLinksMock = allNavLinks.map(getNavLink);
