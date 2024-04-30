/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type {
  NavigationTreeDefinition,
  SolutionNavigationDefinition,
} from '@kbn/core-chrome-browser';
import { of } from 'rxjs';

const title = i18n.translate('navigation.obltNav.headerSolutionSwitcher.obltSolutionTitle', {
  defaultMessage: 'Observability',
});
const icon = 'logoObservability';

const navTree: NavigationTreeDefinition = {
  body: [
    { type: 'recentlyAccessed' },
    {
      type: 'navGroup',
      id: 'observability_project_nav',
      title,
      icon,
      defaultIsCollapsed: false,
      isCollapsible: false,
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'observability-overview',
        },
        {
          link: 'discover',
          renderAs: 'item',
          children: [
            {
              // This is to show "observability-log-explorer" breadcrumbs when navigating from "discover" to "log explorer"
              link: 'observability-logs-explorer',
            },
          ],
        },
        {
          link: 'dashboards',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/dashboards'));
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
          link: 'slo',
        },
        {
          id: 'aiMl',
          title: i18n.translate('navigation.obltNav.ml.aiAndMlGroupTitle', {
            defaultMessage: 'AI & ML',
          }),
          renderAs: 'accordion',
          children: [
            {
              link: 'observabilityAIAssistant',
              title: i18n.translate('navigation.obltNav.aiMl.aiAssistant', {
                defaultMessage: 'AI Assistant',
              }),
            },
            {
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
              title: i18n.translate('navigation.obltNav.ml.logRateAnalysis', {
                defaultMessage: 'Log rate analysis',
              }),
              link: 'ml:logRateAnalysis',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.includes(prepend('/app/ml/aiops/log_rate_analysis'));
              },
            },
            {
              link: 'logs:anomalies',
            },
            {
              link: 'logs:log-categories',
            },
            {
              title: i18n.translate('navigation.obltNav.ml.changePointDetection', {
                defaultMessage: 'Change point detection',
              }),
              link: 'ml:changePointDetections',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.includes(prepend('/app/ml/aiops/change_point_detection'));
              },
            },
            {
              title: i18n.translate('navigation.obltNav.ml.job.notifications', {
                defaultMessage: 'Job notifications',
              }),
              link: 'ml:notifications',
            },
          ],
        },
        {
          id: 'apm',
          title: i18n.translate('navigation.obltNav.applications', {
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
            {
              id: 'synthetics',
              title: i18n.translate('navigation.obltNav.apm.syntheticsGroupTitle', {
                defaultMessage: 'Synthetics',
              }),
              renderAs: 'accordion',
              children: [
                {
                  link: 'synthetics',
                  title: i18n.translate('navigation.obltNav.apm.synthetics.monitors', {
                    defaultMessage: 'Monitors',
                  }),
                },
                { link: 'synthetics:certificates' },
              ],
            },
            { link: 'ux' },
          ],
        },
        {
          id: 'metrics',
          title: i18n.translate('navigation.obltNav.infrastructure', {
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
            {
              link: 'metrics:metrics-explorer',
            },
            {
              id: 'profiling',
              title: i18n.translate('navigation.obltNav.infrastructure.universalProfiling', {
                defaultMessage: 'Universal Profiling',
              }),
              renderAs: 'accordion',
              children: [
                {
                  link: 'profiling:stacktraces',
                },
                {
                  link: 'profiling:flamegraphs',
                },
                {
                  link: 'profiling:functions',
                },
              ],
            },
          ],
        },
        {
          id: 'otherTools',
          title: i18n.translate('navigation.obltNav.otherTools', {
            defaultMessage: 'Other tools',
          }),
          renderAs: 'accordion',
          children: [
            {
              link: 'logs:stream',
              title: i18n.translate('navigation.obltNav.otherTools.logsStream', {
                defaultMessage: 'Logs stream',
              }),
            },
          ],
        },
      ],
    },
  ],
  footer: [
    {
      type: 'navItem',
      title: i18n.translate('navigation.obltNav.getStarted', {
        defaultMessage: 'Get started',
      }),
      link: 'observabilityOnboarding',
      icon: 'launch',
    },
    {
      type: 'navItem',
      id: 'devTools',
      title: i18n.translate('navigation.obltNav.devTools', {
        defaultMessage: 'Developer tools',
      }),
      link: 'dev_tools',
      icon: 'editorCodeBlock',
    },
    {
      type: 'navGroup',
      id: 'project_settings_project_nav',
      title: i18n.translate('navigation.obltNav.management', {
        defaultMessage: 'Management',
      }),
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'management',
          title: i18n.translate('navigation.obltNav.stackManagement', {
            defaultMessage: 'Stack Management',
          }),
          renderAs: 'panelOpener',
          spaceBefore: null,
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

export const definition: SolutionNavigationDefinition = {
  id: 'oblt',
  title,
  icon: 'logoObservability',
  homePage: 'observabilityOnboarding',
  navigationTree$: of(navTree),
};
