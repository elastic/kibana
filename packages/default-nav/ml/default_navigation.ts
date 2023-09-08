/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { NodeDefinitionWithChildren } from '@kbn/core-chrome-browser';
import type { DeepLinkId } from '@kbn/deeplinks-ml';

export type NavigationID =
  | 'rootNav:ml'
  | 'root'
  | 'anomaly_detection'
  | 'data_frame_analytics'
  | 'model_management'
  | 'data_visualizer'
  | 'aiops_labs';

export type MlNodeDefinition = NodeDefinitionWithChildren<DeepLinkId, NavigationID>;

export const defaultNavigation: MlNodeDefinition = {
  id: 'rootNav:ml',
  title: i18n.translate('defaultNavigation.ml.machineLearning', {
    defaultMessage: 'Machine Learning',
  }),
  icon: 'machineLearningApp',
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
      title: i18n.translate('defaultNavigation.ml.anomalyDetection', {
        defaultMessage: 'Anomaly Detection',
      }),
      id: 'anomaly_detection',
      children: [
        {
          title: i18n.translate('defaultNavigation.ml.jobs', {
            defaultMessage: 'Jobs',
          }),
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
      title: i18n.translate('defaultNavigation.ml.dataFrameAnalytics', {
        defaultMessage: 'Data Frame Analytics',
      }),
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
      title: i18n.translate('defaultNavigation.ml.modelManagement', {
        defaultMessage: 'Model Management',
      }),
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
      title: i18n.translate('defaultNavigation.ml.dataVisualizer', {
        defaultMessage: 'Data Visualizer',
      }),
      children: [
        {
          title: i18n.translate('defaultNavigation.ml.file', {
            defaultMessage: 'File',
          }),
          link: 'ml:fileUpload',
        },
        {
          title: i18n.translate('defaultNavigation.ml.dataView', {
            defaultMessage: 'Data view',
          }),
          link: 'ml:indexDataVisualizer',
        },
      ],
    },
    {
      id: 'aiops_labs',
      title: i18n.translate('defaultNavigation.ml.aiopsLabs', {
        defaultMessage: 'AIOps labs',
      }),
      children: [
        {
          link: 'ml:logRateAnalysis',
        },
        {
          link: 'ml:logPatternAnalysis',
        },
        {
          link: 'ml:changePointDetections',
        },
      ],
    },
  ],
};
