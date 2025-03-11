/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
      link: 'ml:overview',
    },
    {
      link: 'ml:notifications',
    },
    {
      link: 'ml:memoryUsage',
    },
    {
      title: i18n.translate('defaultNavigation.ml.anomalyDetection', {
        defaultMessage: 'Anomaly Detection',
      }),
      link: 'ml:anomalyDetection',
      renderAs: 'accordion',
      children: [
        {
          title: i18n.translate('defaultNavigation.ml.jobs', {
            defaultMessage: 'Jobs',
          }),
          link: 'ml:anomalyDetection',
          breadcrumbStatus: 'hidden',
        },
        {
          link: 'ml:anomalyExplorer',
        },
        {
          link: 'ml:singleMetricViewer',
        },
        {
          link: 'ml:suppliedConfigurations',
        },
        {
          link: 'ml:settings',
        },
      ],
    },
    {
      link: 'ml:dataFrameAnalytics',
      title: i18n.translate('defaultNavigation.ml.dataFrameAnalytics', {
        defaultMessage: 'Data Frame Analytics',
      }),
      renderAs: 'accordion',
      children: [
        {
          title: 'Jobs',
          link: 'ml:dataFrameAnalytics',
          breadcrumbStatus: 'hidden',
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
      renderAs: 'accordion',
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
      renderAs: 'accordion',
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
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return (
              pathNameSerialized.includes(prepend('/app/ml/datavisualizer')) ||
              pathNameSerialized.includes(prepend('/app/ml/jobs/new_job/datavisualizer'))
            );
          },
        },
        {
          title: i18n.translate('defaultNavigation.ml.esqlDataVisualizer', {
            defaultMessage: 'ES|QL',
          }),
          link: 'ml:esqlDataVisualizer',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.includes(prepend('/app/ml/datavisualizer/esql'));
          },
        },
        {
          title: i18n.translate('defaultNavigation.ml.dataComparison', {
            defaultMessage: 'Data drift',
          }),
          link: 'ml:dataDrift',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.includes(prepend('/app/ml/data_drift'));
          },
        },
      ],
    },
    {
      id: 'aiops_labs',
      title: i18n.translate('defaultNavigation.ml.aiopsLabs', {
        defaultMessage: 'AIOps labs',
      }),
      renderAs: 'accordion',
      children: [
        {
          link: 'ml:logRateAnalysis',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.includes(prepend('/app/ml/aiops/log_rate_analysis'));
          },
        },
        {
          link: 'ml:logPatternAnalysis',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.includes(prepend('/app/ml/aiops/log_categorization'));
          },
        },
        {
          link: 'ml:changePointDetections',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.includes(prepend('/app/ml/aiops/change_point_detection'));
          },
        },
      ],
    },
  ],
};
