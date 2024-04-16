/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type {
  SolutionNavigationDefinition,
  NavigationTreeDefinition,
} from '@kbn/core-chrome-browser';
import { of } from 'rxjs';

const title = i18n.translate(
  'navigation.analyticsNav.headerSolutionSwitcher.analyticsSolutionTitle',
  {
    defaultMessage: 'Analytics',
  }
);
const icon = 'visualizeApp';

const navTree: NavigationTreeDefinition = {
  body: [
    { type: 'recentlyAccessed' },
    {
      type: 'navGroup',
      id: 'analytics_project_nav',
      title,
      icon,
      defaultIsCollapsed: false,
      isCollapsible: false,
      breadcrumbStatus: 'hidden',
      children: [
        { link: 'discover' },
        {
          link: 'dashboards',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/dashboards'));
          },
        },
        {
          title: i18n.translate('navigation.analyticsNav.visualizationLinkTitle', {
            defaultMessage: 'Visualizations',
          }),
          link: 'visualize',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return (
              pathNameSerialized.startsWith(prepend('/app/visualize')) ||
              pathNameSerialized.startsWith(prepend('/app/lens'))
            );
          },
        },
        {
          id: 'moreEditorsGroup',
          title: i18n.translate('navigation.analyticsNav.moreEditorsGroupTitle', {
            defaultMessage: 'More editors...',
          }),
          renderAs: 'accordion',
          spaceBefore: null,
          children: [
            {
              link: 'canvas',
            },
            {
              link: 'graph',
            },
            {
              link: 'maps',
            },
          ],
        },
      ],
    },
  ],
  footer: [
    {
      title: i18n.translate('navigation.analyticsNav.management.getStarted', {
        defaultMessage: 'Get started',
      }),
      icon: 'launch',
      type: 'navItem',
      link: 'home',
    },
    {
      type: 'navItem',
      id: 'devTools',
      title: i18n.translate('navigation.obltNav.devTools', {
        defaultMessage: 'Developer tools',
      }),
      link: 'dev_tools:console',
      icon: 'editorCodeBlock',
      getIsActive: ({ pathNameSerialized, prepend }) => {
        return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
      },
    },
    {
      type: 'navGroup',
      id: 'project_settings_project_nav',
      title: i18n.translate('navigation.analyticsNav.management', {
        defaultMessage: 'Management',
      }),
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'management',
          title: i18n.translate('navigation.analyticsNav.mngt', {
            defaultMessage: 'Stack Management',
          }),
          spaceBefore: null,
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
      ],
    },
  ],
};

export const definition: SolutionNavigationDefinition = {
  id: 'analytics',
  title,
  icon,
  homePage: 'home',
  navigationTree$: of(navTree),
};
