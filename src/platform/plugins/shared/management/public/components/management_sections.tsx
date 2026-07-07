/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ManagementSectionId } from '../types';

const ingestTitle = i18n.translate('management.sections.ingestTitle', {
  defaultMessage: 'Ingest',
});

const ingestTip = i18n.translate('management.sections.ingestTip', {
  defaultMessage: 'Manage how to transform data and load it into the cluster',
});

const dataTitle = i18n.translate('management.sections.dataTitle', {
  defaultMessage: 'Data',
});

const dataTip = i18n.translate('management.sections.dataTip', {
  defaultMessage: 'Manage your cluster data and backups',
});

const insightsAndAlertingTitle = i18n.translate('management.sections.insightsAndAlertingTitle', {
  defaultMessage: 'Alerts and Insights',
});

const insightsAndAlertingTip = i18n.translate('management.sections.insightsAndAlertingTip', {
  defaultMessage: 'Manage how to detect changes in your data',
});

const machineLearningTitle = i18n.translate('management.sections.machineLearningTitle', {
  defaultMessage: 'Machine Learning',
});

const machineLearningTip = i18n.translate('management.sections.machineLearningTip', {
  defaultMessage: 'Manage your Machine Learning jobs and trained models',
});

const sectionTitle = i18n.translate('management.sections.section.title', {
  defaultMessage: 'Security',
});

const sectionTip = i18n.translate('management.sections.section.tip', {
  defaultMessage: 'Control access to features and data',
});

const kibanaTitle = i18n.translate('management.sections.kibanaTitle', {
  defaultMessage: 'Kibana',
});

const kibanaTip = i18n.translate('management.sections.kibanaTip', {
  defaultMessage: 'Customize Kibana and manage saved objects',
});

const aiTitle = i18n.translate('management.sections.aiTitle', {
  defaultMessage: 'AI',
});

const stackTitle = i18n.translate('management.sections.stackTitle', {
  defaultMessage: 'Stack',
});

const stackTip = i18n.translate('management.sections.stackTip', {
  defaultMessage: 'Manage your license and upgrade the Stack',
});

const clusterPerformanceTitle = i18n.translate('management.sections.clusterPerformanceTitle', {
  defaultMessage: 'Cluster performance',
});

export const IngestSection = {
  id: ManagementSectionId.Ingest,
  title: ingestTitle,
  tip: ingestTip,
  order: 0,
};

export const DataSection = {
  id: ManagementSectionId.Data,
  title: dataTitle,
  tip: dataTip,
  order: 1,
};

export const InsightsAndAlertingSection = {
  id: ManagementSectionId.InsightsAndAlerting,
  title: insightsAndAlertingTitle,
  tip: insightsAndAlertingTip,
  order: 2,
};

export const ClusterPerformanceSection = {
  id: ManagementSectionId.ClusterPerformance,
  title: clusterPerformanceTitle,
  order: 2.5,
};

export const MachineLearningSection = {
  id: ManagementSectionId.MachineLearning,
  title: machineLearningTitle,
  tip: machineLearningTip,
  order: 4,
};

const modelManagementTitle = i18n.translate('management.sections.modelManagementTitle', {
  defaultMessage: 'Model Management',
});

const modelManagementTip = i18n.translate('management.sections.modelManagementTip', {
  defaultMessage: 'Manage your inference models and endpoints',
});

export const ModelManagementSection = {
  id: ManagementSectionId.ModelManagement,
  title: modelManagementTitle,
  tip: modelManagementTip,
  order: 5,
};

export const SecuritySection = {
  id: 'security',
  title: sectionTitle,
  tip: sectionTip,
  order: 3,
};

export const KibanaSection = {
  id: ManagementSectionId.Kibana,
  title: kibanaTitle,
  tip: kibanaTip,
  order: 6,
};

export const AISection = {
  id: ManagementSectionId.AI,
  title: aiTitle,
  order: 7,
};

export const StackSection = {
  id: ManagementSectionId.Stack,
  title: stackTitle,
  tip: stackTip,
  order: 8,
};

export const managementSections = [
  IngestSection,
  DataSection,
  InsightsAndAlertingSection,
  MachineLearningSection,
  ModelManagementSection,
  SecuritySection,
  KibanaSection,
  AISection,
  StackSection,
  ClusterPerformanceSection,
];
