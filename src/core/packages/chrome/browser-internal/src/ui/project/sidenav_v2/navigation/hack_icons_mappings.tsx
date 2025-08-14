/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppDeepLinkId } from '@kbn/core-chrome-browser';
import { IconType } from '@elastic/eui';

// TODO: Remove this once the navigation is fully migrated to the new system.
export const AppDeepLinkIdToIcon: Record<AppDeepLinkId | string, IconType | ''> = {
  // Core
  discover: 'discoverApp',
  dashboards: 'dashboardApp',
  searchHomepage: 'logoElasticsearch',
  elasticsearchIndexManagement: 'indexManagementApp',

  // Enterprise Search
  'enterpriseSearchContent:connectors': 'link',
  'enterpriseSearchApplications:searchApplications': 'searchProfilerApp',
  'searchSynonyms:synonyms': 'indexPatternApp',
  searchQueryRules: 'controls',

  // Platform & Dev tools
  dev_tools: 'devToolsApp',
  stack_management: 'gear',
  monitoring: 'monitoringApp',
  cases: 'casesApp',

  // Observability
  'observability-overview': 'logoObservability',
  'observability-overview:alerts': 'bell',
  'observability-overview:cases': 'casesApp',
  slo: 'visGauge',
  observabilityAIAssistant: 'sparkles',
  'machine_learning-landing': 'machineLearningApp',
  fleet: 'fleetApp',

  // APM & related views
  apm: 'apps',
  'apm:services': 'apmApp', // Service inventory
  'apm:traces': 'apmTrace', // Traces view
  'apm:dependencies': 'branch', // Dependencies graph
  ux: 'user', // User experience
  synthetics: 'uptimeApp', // Monitors
  'synthetics:certificates': 'lock', // TLS certificates

  // Metrics/Infrastructure
  metrics: 'storage',
  'metrics:inventory': 'metricsApp',
  'metrics:hosts': 'compute',
  'metrics:metrics-explorer': 'visMetric',

  // Machine learning
  machine_learning_landing: 'machineLearningApp',
  'ml:dataVisualizer': 'dataVisualizer',

  // Integrations & tools
  otherTools: 'wrench',
  integrations: 'plugs',

  // Security
  alerts: 'bell',
  'securityGroup:rules': 'securitySignal',
  'securityGroup:investigations': 'casesApp',
  'securityGroup:assets': 'indexManagementApp',
  'securityGroup:machineLearning': 'machineLearningApp',
  attack_discovery: 'lensApp',
  'cloud_security_posture-findings': 'logoSecurity',
  'securityGroup:explore': 'search',
  threat_intelligence: 'bug',
};
