/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  DefaultNavigation,
  NavigationKibanaProvider,
  type NavigationTreeDefinition,
} from '@kbn/shared-ux-chrome-navigation';
import { i18n } from '@kbn/i18n';
import { Workflow } from '@kbn/core-chrome-browser';
import type { WorkflowDeps } from '.';

const navigationTree: NavigationTreeDefinition = {
  body: [
    {
      type: 'navGroup',
      id: 'security_project_nav',
      title: 'Security',
      icon: 'logoSecurity',
      breadcrumbStatus: 'hidden',
      defaultIsCollapsed: false,
      children: [
        {
          spaceBefore: null,
          breadcrumbStatus: 'hidden',
          children: [
            { id: 'discover:', link: 'discover', title: 'Discover' },
            {
              id: 'dashboards',
              link: 'securitySolutionUI:dashboards',
              title: 'Dashboards',
              children: [
                {
                  id: 'overview',
                  // link: 'securitySolutionUI:overview',
                  link: 'dashboards',
                  icon: 'dashboardApp',
                  title: 'Overview',
                },
                {
                  id: 'detection_response',
                  // link: 'securitySolutionUI:detection_response',
                  link: 'dashboards',
                  icon: 'dashboardApp',
                  title: 'Detection & Response',
                },
                {
                  id: 'kubernetes',
                  // link: 'securitySolutionUI:kubernetes',
                  link: 'dashboards',
                  icon: 'dashboardApp',
                  title: 'Kubernetes',
                },
                {
                  id: 'cloud_security_posture-dashboard',
                  // link: 'securitySolutionUI:cloud_security_posture-dashboard',
                  link: 'dashboards',
                  icon: 'dashboardApp',
                  title: 'Cloud Security Posture',
                },
                {
                  id: 'cloud_security_posture-vulnerability_dashboard',
                  link: 'dashboards',
                  icon: 'dashboardApp',
                  // link: 'securitySolutionUI:cloud_security_posture-vulnerability_dashboard',
                  title: 'Cloud Native Vulnerability Management',
                },
                {
                  id: 'entity_analytics',
                  // link: 'securitySolutionUI:entity_analytics',
                  link: 'dashboards',
                  icon: 'dashboardApp',
                  title: 'Entity Analytics',
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: 'rules-landing',
              link: 'securitySolutionUI:rules-landing',
              title: 'Rules',
              children: [
                {
                  id: 'category-management',
                  title: 'Management',
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      id: 'rules',
                      // link: 'securitySolutionUI:rules',
                      link: 'dashboards',
                      title: 'Detection rules (SIEM)',
                      renderAs: 'item',
                      children: [
                        {
                          id: 'rules-add',
                          // link: 'securitySolutionUI:rules-add',
                          link: 'dashboards',
                          title: 'Add Rules',
                        },
                        {
                          id: 'rules-create',
                          // link: 'securitySolutionUI:rules-create',
                          link: 'dashboards',
                          title: 'Create new rule',
                        },
                      ],
                    },
                    {
                      id: 'cloud_security_posture-benchmarks',
                      // link: 'securitySolutionUI:cloud_security_posture-benchmarks',
                      link: 'dashboards',
                      title: 'Benchmark rules',
                    },
                    {
                      id: 'exceptions',
                      // link: 'securitySolutionUI:exceptions',
                      link: 'dashboards',
                      title: 'Shared exception lists',
                    },
                  ],
                },
                {
                  id: 'category-discover',
                  title: 'Discover',
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      id: 'coverage-overview',
                      // link: 'securitySolutionUI:coverage-overview',
                      link: 'dashboards',
                      title: 'MITRE ATT&CK® Coverage',
                    },
                  ],
                },
              ],
              renderAs: 'panelOpener',
            },
            {
              id: 'alerts',
              link: 'securitySolutionUI:alerts',
              title: 'Alerts',
            },
            {
              id: 'cloud_security_posture-findings',
              link: 'securitySolutionUI:cloud_security_posture-findings',
              title: 'Findings',
            },
            {
              id: 'cases',
              link: 'securitySolutionUI:cases',
              title: 'Cases',
              children: [
                {
                  id: 'cases_create',
                  link: 'securitySolutionUI:cases_create',
                  title: 'Create',
                  sideNavStatus: 'hidden',
                },
                {
                  id: 'cases_configure',
                  link: 'securitySolutionUI:cases_configure',
                  title: 'Settings',
                  sideNavStatus: 'hidden',
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: 'investigations',
              // link: 'securitySolutionUI:investigations',
              link: 'dashboards',
              title: 'Investigations',
              children: [
                {
                  id: 'timelines',
                  link: 'securitySolutionUI:timelines',
                  title: 'Timelines',
                  renderAs: 'item',
                  children: [
                    {
                      id: 'timelines-templates',
                      link: 'securitySolutionUI:timelines-templates',
                      title: 'Templates',
                    },
                  ],
                },
                {
                  id: 'osquery:',
                  link: 'osquery',
                  title: 'Osquery',
                },
              ],
              renderAs: 'panelOpener',
            },
            {
              id: 'threat_intelligence',
              link: 'securitySolutionUI:threat_intelligence',
              title: 'Intelligence',
            },
            {
              id: 'explore',
              link: 'securitySolutionUI:explore',
              title: 'Explore',
              children: [
                {
                  id: 'hosts',
                  // link: 'securitySolutionUI:hosts',
                  link: 'dashboards',
                  title: 'Hosts',
                  renderAs: 'item',
                  children: [
                    {
                      id: 'uncommon_processes',
                      link: 'securitySolutionUI:uncommon_processes',
                      title: 'Uncommon Processes',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'hosts-anomalies',
                      link: 'securitySolutionUI:hosts-anomalies',
                      title: 'Anomalies',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'hosts-events',
                      link: 'securitySolutionUI:hosts-events',
                      title: 'Events',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'hosts-risk',
                      link: 'securitySolutionUI:hosts-risk',
                      title: 'Host risk',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'sessions',
                      link: 'securitySolutionUI:sessions',
                      title: 'Sessions',
                      breadcrumbStatus: 'hidden',
                    },
                  ],
                },
                {
                  id: 'network',
                  // link: 'securitySolutionUI:network',
                  link: 'dashboards',
                  title: 'Network',
                  renderAs: 'item',
                  children: [
                    {
                      id: 'network-dns',
                      link: 'securitySolutionUI:network-dns',
                      title: 'DNS',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'network-http',
                      link: 'securitySolutionUI:network-http',
                      title: 'HTTP',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'network-tls',
                      link: 'securitySolutionUI:network-tls',
                      title: 'TLS',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'network-anomalies',
                      link: 'securitySolutionUI:network-anomalies',
                      title: 'Anomalies',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'network-events',
                      link: 'securitySolutionUI:network-events',
                      title: 'Events',
                      breadcrumbStatus: 'hidden',
                    },
                  ],
                },
                {
                  id: 'users',
                  // link: 'securitySolutionUI:users',
                  link: 'dashboards',
                  title: 'Users',
                  renderAs: 'item',
                  children: [
                    {
                      id: 'users-authentications',
                      link: 'securitySolutionUI:users-authentications',
                      title: 'Authentications',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'users-anomalies',
                      link: 'securitySolutionUI:users-anomalies',
                      title: 'Anomalies',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'users-risk',
                      link: 'securitySolutionUI:users-risk',
                      title: 'User risk',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: 'users-events',
                      link: 'securitySolutionUI:users-events',
                      title: 'Events',
                      breadcrumbStatus: 'hidden',
                    },
                  ],
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: 'assets',
              // link: 'securitySolutionUI:assets',
              link: 'dashboards',
              title: 'Assets',
              children: [
                {
                  id: 'fleet:',
                  link: 'fleet',
                  title: 'Fleet',
                  renderAs: 'item',
                  children: [
                    {
                      id: 'fleet:agents',
                      link: 'fleet:agents',
                      title: 'Agents',
                    },
                    {
                      id: 'fleet:policies',
                      link: 'fleet:policies',
                      title: 'Policies',
                    },
                    {
                      id: 'fleet:enrollment_tokens',
                      link: 'fleet:enrollment_tokens',
                      title: 'Enrollment tokens',
                    },
                    {
                      id: 'fleet:uninstall_tokens',
                      link: 'fleet:uninstall_tokens',
                      title: 'Uninstall tokens',
                    },
                    {
                      id: 'fleet:data_streams',
                      link: 'fleet:data_streams',
                      title: 'Data streams',
                    },
                    {
                      id: 'fleet:settings',
                      link: 'fleet:settings',
                      title: 'Settings',
                    },
                  ],
                },
                {
                  id: 'endpoints',
                  // link: 'securitySolutionUI:endpoints',
                  link: 'dashboards',
                  title: 'Endpoints',
                  renderAs: 'item',
                  children: [
                    {
                      id: 'policy',
                      link: 'securitySolutionUI:policy',
                      title: 'Policies',
                    },
                    {
                      id: 'trusted_apps',
                      link: 'securitySolutionUI:trusted_apps',
                      title: 'Trusted applications',
                    },
                    {
                      id: 'event_filters',
                      link: 'securitySolutionUI:event_filters',
                      title: 'Event filters',
                    },
                    {
                      id: 'host_isolation_exceptions',
                      link: 'securitySolutionUI:host_isolation_exceptions',
                      title: 'Host isolation exceptions',
                    },
                    {
                      id: 'blocklist',
                      link: 'securitySolutionUI:blocklist',
                      title: 'Blocklist',
                    },
                    {
                      id: 'response_actions_history',
                      link: 'securitySolutionUI:response_actions_history',
                      title: 'Response actions history',
                    },
                  ],
                },
                {
                  id: 'cloud_defend',
                  // link: 'securitySolutionUI:cloud_defend',
                  link: 'dashboards',
                  title: 'Cloud',
                  renderAs: 'item',
                  children: [
                    {
                      id: 'cloud_defend-policies',
                      link: 'securitySolutionUI:cloud_defend-policies',
                      title: 'Container Workload Protection',
                    },
                  ],
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: 'machine_learning-landing',
              // link: 'securitySolutionUI:machine_learning-landing',
              link: 'dashboards',
              title: 'Machine learning',
              children: [
                {
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      id: 'ml:overview',
                      link: 'ml:overview',
                      title: 'Overview',
                    },
                    {
                      id: 'ml:notifications',
                      link: 'ml:notifications',
                      title: 'Notifications',
                    },
                    {
                      id: 'ml:memoryUsage',
                      link: 'ml:memoryUsage',
                      title: 'Memory usage',
                    },
                  ],
                },
                {
                  id: 'category-anomaly_detection',
                  title: 'Anomaly detection',
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      id: 'ml:anomalyDetection',
                      link: 'ml:anomalyDetection',
                      title: 'Jobs',
                    },
                    {
                      id: 'ml:anomalyExplorer',
                      link: 'ml:anomalyExplorer',
                      title: 'Anomaly explorer',
                    },
                    {
                      id: 'ml:singleMetricViewer',
                      link: 'ml:singleMetricViewer',
                      title: 'Single metric viewer',
                    },
                    {
                      id: 'ml:settings',
                      link: 'ml:settings',
                      title: 'Settings',
                    },
                  ],
                },
                {
                  id: 'category-data_frame analytics',
                  title: 'Data frame analytics',
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      id: 'ml:dataFrameAnalytics',
                      link: 'ml:dataFrameAnalytics',
                      title: 'Jobs',
                    },
                    {
                      id: 'ml:resultExplorer',
                      link: 'ml:resultExplorer',
                      title: 'Result explorer',
                    },
                    {
                      id: 'ml:analyticsMap',
                      link: 'ml:analyticsMap',
                      title: 'Analytics map',
                    },
                  ],
                },
                {
                  id: 'category-model_management',
                  title: 'Model management',
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      id: 'ml:nodesOverview',
                      link: 'ml:nodesOverview',
                      title: 'Trained models',
                    },
                  ],
                },
                {
                  id: 'category-data_visualizer',
                  title: 'Data visualizer',
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      id: 'ml:fileUpload',
                      link: 'ml:fileUpload',
                      title: 'File data visualizer',
                    },
                    {
                      id: 'ml:indexDataVisualizer',
                      link: 'ml:indexDataVisualizer',
                      title: 'Data view data visualizer',
                    },
                    {
                      id: 'ml:dataDrift',
                      link: 'ml:dataDrift',
                      title: 'Data drift',
                    },
                  ],
                },
                {
                  id: 'category-aiops_labs',
                  title: 'Aiops labs',
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      id: 'ml:logRateAnalysis',
                      link: 'ml:logRateAnalysis',
                      title: 'Log Rate Analysis',
                    },
                    {
                      id: 'ml:logPatternAnalysis',
                      link: 'ml:logPatternAnalysis',
                      title: 'Log pattern analysis',
                    },
                    {
                      id: 'ml:changePointDetections',
                      link: 'ml:changePointDetections',
                      title: 'Change point detection',
                    },
                  ],
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
      ],
      isCollapsible: false,
    },
  ],
  footer: [
    {
      type: 'navItem',
      link: 'securitySolutionUI:get_started',
      title: 'Get started',
      icon: 'launch',
    },
    {
      type: 'navItem',
      link: 'dev_tools',
      title: 'Developer tools',
      icon: 'editorCodeBlock',
    },
    {
      type: 'navGroup',
      id: 'category-project_settings',
      title: 'Project settings',
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'management',
          title: i18n.translate('navigation.nav.mngt', {
            defaultMessage: 'Management',
          }),
          renderAs: 'panelOpener',
          children: [
            {
              title: 'Ingest',
              children: [{ link: 'management:ingest_pipelines' }, { link: 'management:pipelines' }],
            },
            {
              title: 'Data',
              children: [
                { link: 'management:index_management' },
                { link: 'management:index_lifecycle_management' },
                { link: 'management:snapshot_restore' },
                { link: 'management:rollup_jobs' },
                { link: 'management:transform' },
                { link: 'management:cross_cluster_replication' },
                { link: 'management:remote_clusters' },
                { link: 'management:migrate_data' },
              ],
            },
            {
              title: 'Alerts and Insights',
              children: [
                { link: 'management:triggersActions' },
                { link: 'management:cases' },
                { link: 'management:triggersActionsConnectors' },
                { link: 'management:reporting' },
                { link: 'management:jobsListLink' },
                { link: 'management:watcher' },
                { link: 'management:maintenanceWindows' },
              ],
            },
            {
              title: 'Security',
              children: [
                { link: 'management:users' },
                { link: 'management:roles' },
                { link: 'management:api_keys' },
                { link: 'management:role_mappings' },
              ],
            },
            {
              title: 'Kibana',
              children: [
                { link: 'management:dataViews' },
                { link: 'management:filesManagement' },
                { link: 'management:objects' },
                { link: 'management:tags' },
                { link: 'management:search_sessions' },
                { link: 'management:spaces' },
                { link: 'management:settings' },
              ],
            },
            {
              title: 'Stack',
              children: [
                { link: 'management:license_management' },
                { link: 'management:upgrade_assistant' },
              ],
            },
          ],
        },
        { title: 'Integrations', link: 'integrations' },
        {
          title: 'Users and roles',
          cloudLink: 'userAndRoles',
          openInNewTab: true,
        },
        {
          title: 'Billing and subscription',
          cloudLink: 'billingAndSub',
          openInNewTab: true,
        },
      ],
    },
  ],
};

const createSideNavComponent =
  ({ core, serverless, cloud }: WorkflowDeps) =>
  () => {
    return (
      <NavigationKibanaProvider core={core} serverless={serverless} cloud={cloud}>
        <DefaultNavigation navigationTree={navigationTree} dataTestSubj="svlSearchSideNav" />
      </NavigationKibanaProvider>
    );
  };

export const getWorkflow = (deps: WorkflowDeps): Workflow => {
  return {
    id: 'security',
    title: 'Security',
    style: 'project',
    icon: 'logoSecurity',
    homePage: 'securitySolutionUI:get_started',
    navigation: createSideNavComponent(deps),
  };
};
