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
      id: 'search_project_nav',
      title: 'Search',
      icon: 'logoElasticsearch',
      defaultIsCollapsed: false,
      isCollapsible: false,
      breadcrumbStatus: 'hidden',
      children: [
        {
          id: 'search_getting_started',
          title: i18n.translate('navigation.nav.gettingStarted', {
            defaultMessage: 'Home',
          }),
          link: 'dev_tools:console',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/home'));
          },
        },
        {
          id: 'dev_tools',
          title: i18n.translate('navigation.nav.search.devTools', {
            defaultMessage: 'Dev Tools',
          }),
          link: 'dev_tools:console',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
          },
        },
        {
          id: 'explore',
          title: i18n.translate('navigation.nav.explore', {
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
            {
              link: 'visualize',
              title: i18n.translate('navigation.nav.visualize', {
                defaultMessage: 'Visualizations',
              }),
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return (
                  pathNameSerialized.startsWith(prepend('/app/visualize')) ||
                  pathNameSerialized.startsWith(prepend('/app/lens')) ||
                  pathNameSerialized.startsWith(prepend('/app/maps'))
                );
              },
            },
          ],
        },
        {
          id: 'content',
          title: i18n.translate('navigation.nav.content', {
            defaultMessage: 'Content',
          }),
          children: [
            {
              title: i18n.translate('navigation.nav.content.indices', {
                defaultMessage: 'Indices',
              }),
              link: 'management:index_management',
              breadcrumbStatus:
                'hidden' /* management sub-pages set their breadcrumbs themselves */,
              renderAs: 'accordion',
              children: [
                {
                  title: i18n.translate('navigation.nav.content.pipelines', {
                    defaultMessage: 'search-github',
                  }),
                  link: 'management:ingest_pipelines',
                  breadcrumbStatus:
                    'hidden' /* management sub-pages set their breadcrumbs themselves */,
                  renderAs: 'accordion',
                  children: [
                    {
                      title: i18n.translate('navigation.nav.content.pipelines', {
                        defaultMessage: 'Overview',
                      }),
                      link: 'management:ingest_pipelines',
                      breadcrumbStatus:
                        'hidden' /* management sub-pages set their breadcrumbs themselves */,
                      renderAs: 'item',
                    },
                    {
                      title: i18n.translate('navigation.nav.content.pipelines', {
                        defaultMessage: 'Documents',
                      }),
                      link: 'management:ingest_pipelines',
                      breadcrumbStatus:
                        'hidden' /* management sub-pages set their breadcrumbs themselves */,
                      renderAs: 'item',
                    },
                    {
                      title: i18n.translate('navigation.nav.content.pipelines', {
                        defaultMessage: 'Index Mappings',
                      }),
                      link: 'management:ingest_pipelines',
                      breadcrumbStatus:
                        'hidden' /* management sub-pages set their breadcrumbs themselves */,
                      renderAs: 'item',
                    },
                    {
                      title: i18n.translate('navigation.nav.content.pipelines', {
                        defaultMessage: 'Pipelines',
                      }),
                      link: 'management:ingest_pipelines',
                      breadcrumbStatus:
                        'hidden' /* management sub-pages set their breadcrumbs themselves */,
                      renderAs: 'item',
                    },
                  ],
                },
              ],
            },
            {
              title: i18n.translate('navigation.nav.content.indices', {
                defaultMessage: 'Connectors',
              }),
              link: 'management:triggersActionsConnectors',
              breadcrumbStatus:
                'hidden' /* management sub-pages set their breadcrumbs themselves */,
            },
            {
              title: i18n.translate('navigation.nav.content.indices', {
                defaultMessage: 'Web crawlers',
              }),
              link: 'management:triggersActionsConnectors',
              breadcrumbStatus:
                'hidden' /* management sub-pages set their breadcrumbs themselves */,
            },
          ],
        },
        {
          id: 'apps',
          title: i18n.translate('navigation.nav.apps', {
            defaultMessage: 'Applications',
          }),
          children: [
            {
              title: i18n.translate('navigation.nav.content.indices', {
                defaultMessage: 'AI playground',
              }),
              link: 'management:api_keys',
              breadcrumbStatus:
                'hidden' /* management sub-pages set their breadcrumbs themselves */,
            },
            {
              title: i18n.translate('navigation.nav.content.indices', {
                defaultMessage: 'Search applications',
              }),
              link: 'management:index_management',
              breadcrumbStatus:
                'hidden' /* management sub-pages set their breadcrumbs themselves */,
              renderAs: 'accordion',
              children: [
                {
                  title: i18n.translate('navigation.nav.content.pipelines', {
                    defaultMessage: 'Test',
                  }),
                  link: 'management:ingest_pipelines',
                  breadcrumbStatus:
                    'hidden' /* management sub-pages set their breadcrumbs themselves */,
                  renderAs: 'accordion',
                  children: [
                    {
                      title: i18n.translate('navigation.nav.content.pipelines', {
                        defaultMessage: 'Docs explorer',
                      }),
                      link: 'management:ingest_pipelines',
                      breadcrumbStatus:
                        'hidden' /* management sub-pages set their breadcrumbs themselves */,
                      renderAs: 'item',
                    },
                    {
                      title: i18n.translate('navigation.nav.content.pipelines', {
                        defaultMessage: 'Content',
                      }),
                      link: 'management:ingest_pipelines',
                      breadcrumbStatus:
                        'hidden' /* management sub-pages set their breadcrumbs themselves */,
                      renderAs: 'item',
                    },
                    {
                      title: i18n.translate('navigation.nav.content.pipelines', {
                        defaultMessage: 'Connect',
                      }),
                      link: 'management:ingest_pipelines',
                      breadcrumbStatus:
                        'hidden' /* management sub-pages set their breadcrumbs themselves */,
                      renderAs: 'item',
                    },
                  ],
                },
              ],
            },
            {
              title: i18n.translate('navigation.nav.content.indices', {
                defaultMessage: 'Behavioral analytics',
              }),
              link: 'management:api_keys',
              breadcrumbStatus:
                'hidden' /* management sub-pages set their breadcrumbs themselves */,
            },
          ],
        },
        {
          id: 'entsearch',
          title: i18n.translate('navigation.nav.entsearch', {
            defaultMessage: 'Enterprise Search',
          }),
          children: [
            {
              title: i18n.translate('navigation.nav.content.indices', {
                defaultMessage: 'App Search',
              }),
              link: 'management:api_keys',
              breadcrumbStatus:
                'hidden' /* management sub-pages set their breadcrumbs themselves */,
            },
            {
              title: i18n.translate('navigation.nav.content.indices', {
                defaultMessage: 'Workplace Search',
              }),
              link: 'management:api_keys',
              breadcrumbStatus:
                'hidden' /* management sub-pages set their breadcrumbs themselves */,
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
      title: i18n.translate('navigation.nav.projectSettings', {
        defaultMessage: 'Management',
      }),
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          title: i18n.translate('navigation.nav.projectSettings', {
            defaultMessage: 'Trained models',
          }),
          link: 'fleet',
        },
        {
          link: 'management',
          title: i18n.translate('navigation.nav.mngt', {
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
        // {
        //   id: 'cloudLinkDeployment',
        //   cloudLink: 'deployment',
        //   title: i18n.translate('navigation.nav.performance', {
        //     defaultMessage: 'Performance',
        //   }),
        // },
        // {
        //   id: 'cloudLinkUserAndRoles',
        //   cloudLink: 'userAndRoles',
        // },
        // {
        //   id: 'cloudLinkBilling',
        //   cloudLink: 'billingAndSub',
        // },
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
    id: 'search',
    title: 'Search',
    style: 'project',
    icon: 'logoElasticsearch',
    navigation: createSideNavComponent(deps),
  };
};
