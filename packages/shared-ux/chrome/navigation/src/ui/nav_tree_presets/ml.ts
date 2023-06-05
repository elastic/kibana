/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DeepLinkId as MlDeepLink } from '@kbn/deeplinks-ml';

import type { NodeDefinitionWithChildren } from './types';

export type ID =
  | 'sharedux:ml'
  | 'root'
  | 'anomaly_detection'
  | 'data_frame_analytics'
  | 'model_management'
  | 'data_visualizer'
  | 'aiops_labs';

export const ml: NodeDefinitionWithChildren<MlDeepLink, ID> = {
  id: 'sharedux:ml',
  title: 'Machine learning',
  icon: 'indexMapping',
  children: [
    {
      title: '',
      id: 'root',
      children: [
        {
          link: 'ml:overview',
        },
        {
          link: 'ml:notifications',
        },
      ],
    },
    {
      title: 'Anomaly detection',
      id: 'anomaly_detection',
      children: [
        {
          title: 'Jobs',
          link: 'ml:anomalyDetection',
        },
        {
          link: 'ml:anomalyExplorer',
        },
        {
          link: 'ml:singleMetricViewer',
        },
        {
          link: 'ml:settings',
        },
      ],
    },
    {
      id: 'data_frame_analytics',
      title: 'Data frame analytics',
      children: [
        {
          title: 'Jobs',
          link: 'ml:dataFrameAnalytics',
        },
        {
          link: 'ml:resultExplorer',
        },
        {
          link: 'ml:analyticsMap',
        },
      ],
    },
    {
      id: 'model_management',
      title: 'Model management',
      children: [
        {
          link: 'ml:nodesOverview',
        },
        {
          link: 'ml:nodes',
        },
      ],
    },
    {
      id: 'data_visualizer',
      title: 'Data visualizer',
      children: [
        {
          title: 'File',
          link: 'ml:fileUpload',
        },
        {
          title: 'Data view',
          link: 'ml:indexDataVisualizer',
        },
      ],
    },
    {
      id: 'aiops_labs',
      title: 'AIOps labs',
      children: [
        {
          title: 'Explain log rate spikes',
          link: 'ml:explainLogRateSpikes',
        },
        {
          link: 'ml:logPatternAnalysis',
        },
      ],
    },
  ],
};
