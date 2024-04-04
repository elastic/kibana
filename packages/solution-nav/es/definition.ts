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

const title = i18n.translate('navigation.searchNav.headerSolutionSwitcher.searchSolutionTitle', {
  defaultMessage: 'Search',
});
const icon = 'logoElasticsearch';

const navTree: NavigationTreeDefinition = {
  body: [
    { type: 'recentlyAccessed' },
    {
      type: 'navGroup',
      id: 'search_project_nav',
      title,
      icon,
      defaultIsCollapsed: false,
      isCollapsible: false,
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'enterpriseSearch',
        },
        {
          id: 'dev_tools',
          title: i18n.translate('navigation.searchNav.devTools', {
            defaultMessage: 'Dev Tools',
          }),
          link: 'dev_tools:console',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
          },
        },
        {
          id: 'kibana',
          title: i18n.translate('navigation.searchNav.kibana', {
            defaultMessage: 'Kibana',
          }),
          children: [
            {
              link: 'discover',
            },
            {
              link: 'dashboards',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/dashboards'));
              },
            },
          ],
        },
        {
          id: 'content',
          title: i18n.translate('navigation.searchNav.content', {
            defaultMessage: 'Content',
          }),
          children: [
            {
              link: 'enterpriseSearchContent:searchIndices',
              // TODO: Build the children dynamically
              // https://github.com/elastic/kibana/issues/179751
              // renderAs: 'accordion',
              // children: [
              //   {
              //     title: i18n.translate(
              //       'navigation.searchNav.content.indices.searchGithub.overview',
              //       {
              //         defaultMessage: 'Overview',
              //       }
              //     ),
              //     link: 'management:index_management',
              //     breadcrumbStatus:
              //       'hidden' /* management sub-pages set their breadcrumbs themselves */,
              //   },
              //   {
              //     title: i18n.translate(
              //       'navigation.searchNav.content.indices.searchGithub.documents',
              //       {
              //         defaultMessage: 'Documents',
              //       }
              //     ),
              //     link: 'management:index_management',
              //   },
              //   {
              //     title: i18n.translate(
              //       'navigation.searchNav.content.indices.searchGithub.indexMappings',
              //       {
              //         defaultMessage: 'Index Mappings',
              //       }
              //     ),
              //     link: 'management:index_management',
              //   },
              //   {
              //     title: i18n.translate(
              //       'navigation.searchNav.content.indices.searchGithub.pipelines',
              //       {
              //         defaultMessage: 'Pipelines',
              //       }
              //     ),
              //     link: 'management:ingest_pipelines',
              //   },
              // ],
            },
            { link: 'enterpriseSearchContent:connectors' },
            { link: 'enterpriseSearchContent:webCrawlers' },
          ],
        },
        {
          id: 'build',
          title: i18n.translate('navigation.searchNav.build', {
            defaultMessage: 'Build',
          }),
          children: [
            {
              link: 'enterpriseSearchContent:playground',
            },
            {
              title: i18n.translate('navigation.searchNav.build.searchApplications', {
                defaultMessage: 'Search applications',
              }),
              link: 'enterpriseSearchApplications:searchApplications',
              // TODO: Build the children dynamically
              // https://github.com/elastic/kibana/issues/179751
              // renderAs: 'accordion',
              // children: [
              //   {
              //     title: i18n.translate(
              //       'navigation.searchNav.build.searchApplications.docsExplorer',
              //       {
              //         defaultMessage: 'Docs explorer',
              //       }
              //     ),
              //     link: 'home',
              //   },
              //   {
              //     title: i18n.translate('navigation.searchNav.build.searchApplications.content', {
              //       defaultMessage: 'Content',
              //     }),
              //     link: 'home',
              //   },
              //   {
              //     title: i18n.translate('navigation.searchNav.build.searchApplications.connect', {
              //       defaultMessage: 'Connect',
              //     }),
              //     link: 'home',
              //   },
              // ],
            },
            {
              link: 'enterpriseSearchAnalytics',
            },
          ],
        },
        {
          id: 'entsearch',
          title: i18n.translate('navigation.searchNav.entsearch', {
            defaultMessage: 'Enterprise Search',
          }),
          children: [
            {
              title: i18n.translate('navigation.searchNav.entsearch.appSearch', {
                defaultMessage: 'App Search',
              }),
              link: 'appSearch:engines',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/enterprise_search/app_search'));
              },
            },
            {
              link: 'workplaceSearch',
            },
          ],
        },
      ],
    },
  ],
  footer: [
    {
      type: 'navGroup',
      id: 'project_settings_project_nav',
      title: i18n.translate('navigation.searchNav.management', {
        defaultMessage: 'Management',
      }),
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          title: i18n.translate('navigation.searchNav.management.trainedModels', {
            defaultMessage: 'Trained models',
          }),
          link: 'ml:modelManagement',
        },
        {
          link: 'management',
          title: i18n.translate('navigation.searchNav.mngt', {
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
  id: 'es',
  title,
  icon,
  homePage: 'enterpriseSearch',
  navigationTree$: of(navTree),
};
