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
    { type: 'recentlyAccessed' },
    {
      type: 'navGroup',
      id: 'observability_project_nav',
      title: 'Observability',
      icon: 'logoObservability',
      defaultIsCollapsed: false,
      isCollapsible: false,
      breadcrumbStatus: 'hidden',
      children: [
        {
          title: i18n.translate('xpack.serverlessObservability.nav.discover', {
            defaultMessage: 'Discover',
          }),
          link: 'discover',
          renderAs: 'item',
          children: [
            {
              // This is to show "observability-log-explorer" breadcrumbs when navigating from "discover" to "log explorer"
              link: 'observability-log-explorer',
              sideNavStatus: 'hidden',
            },
          ],
        },
        {
          title: i18n.translate('navigation.nav.dashboards', {
            defaultMessage: 'Dashboards',
          }),
          link: 'dashboards',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/dashboards'));
          },
        },
        {
          title: i18n.translate('navigation.nav.visualizations', {
            defaultMessage: 'Visualizations',
          }),
          link: 'visualize',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return (
              pathNameSerialized.startsWith(prepend('/app/visualize')) ||
              pathNameSerialized.startsWith(prepend('/app/lens')) ||
              pathNameSerialized.startsWith(prepend('/app/maps'))
            );
          },
        },
        {
          link: 'observability-overview:alerts',
        },
        {
          link: 'observability-overview:cases',
          renderAs: 'item',
          children: [
            {
              link: 'observability-overview:cases_configure',
            },
            {
              link: 'observability-overview:cases_create',
            },
          ],
        },
        {
          link: 'observability-overview:slos',
        },
        {
          id: 'aiops',
          title: 'AIOps',
          renderAs: 'accordion',
          spaceBefore: null,
          children: [
            {
              title: i18n.translate('navigation.nav.ml.jobs', {
                defaultMessage: 'Anomaly detection',
              }),
              link: 'ml:anomalyDetection',
              renderAs: 'item',
              children: [
                {
                  link: 'ml:singleMetricViewer',
                },
                {
                  link: 'ml:anomalyExplorer',
                },
                {
                  link: 'ml:settings',
                },
              ],
            },
            {
              title: i18n.translate('navigation.ml.logRateAnalysis', {
                defaultMessage: 'Log rate analysis',
              }),
              link: 'ml:logRateAnalysis',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.includes(prepend('/app/ml/aiops/log_rate_analysis'));
              },
            },
            {
              title: i18n.translate('navigation.ml.changePointDetection', {
                defaultMessage: 'Change point detection',
              }),
              link: 'ml:changePointDetections',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.includes(prepend('/app/ml/aiops/change_point_detection'));
              },
            },
            {
              title: i18n.translate('navigation.nav.ml.job.notifications', {
                defaultMessage: 'Job notifications',
              }),
              link: 'ml:notifications',
            },
          ],
        },
        {
          id: 'apm',
          title: i18n.translate('navigation.nav.applications', {
            defaultMessage: 'Applications',
          }),
          renderAs: 'accordion',
          children: [
            {
              link: 'apm:services',
              getIsActive: ({ pathNameSerialized }) => {
                const regex = /app\/apm\/.*service.*/;
                return regex.test(pathNameSerialized);
              },
            },
            {
              link: 'apm:traces',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/apm/traces'));
              },
            },
            {
              link: 'apm:dependencies',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/apm/dependencies'));
              },
            },
          ],
        },
        {
          id: 'metrics',
          title: i18n.translate('navigation.nav.infrastructure', {
            defaultMessage: 'Infrastructure',
          }),
          renderAs: 'accordion',
          children: [
            {
              link: 'metrics:inventory',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/metrics/inventory'));
              },
            },
            {
              link: 'metrics:hosts',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/metrics/hosts'));
              },
            },
          ],
        },
      ],
    },
  ],
  footer: [
    {
      type: 'navItem',
      title: i18n.translate('navigation.nav.getStarted', {
        defaultMessage: 'Get started',
      }),
      link: 'observabilityOnboarding',
      icon: 'launch',
    },
    {
      type: 'navItem',
      id: 'devTools',
      title: i18n.translate('navigation.nav.oblt.devTools', {
        defaultMessage: 'Developer tools',
      }),
      link: 'dev_tools',
      icon: 'editorCodeBlock',
    },
    {
      type: 'navGroup',
      id: 'project_settings_project_nav',
      title: i18n.translate('navigation.nav.projectSettings', {
        defaultMessage: 'Project settings',
      }),
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
        {
          link: 'integrations',
        },
        {
          link: 'fleet',
        },
        {
          id: 'cloudLinkUserAndRoles',
          cloudLink: 'userAndRoles',
        },
        {
          id: 'cloudLinkBilling',
          cloudLink: 'billingAndSub',
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
    id: 'observability',
    title: 'Observability',
    style: 'project',
    icon: 'logoObservability',
    homePage: 'observabilityOnboarding',
    navigation: createSideNavComponent(deps),
  };
};
