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
import type { DeepLinkId } from '@kbn/deeplinks-management';

export type NavigationID =
  | 'rootNav:management'
  | 'root'
  | 'integration_management'
  | 'stack_management'
  | 'ingest'
  | 'data'
  | 'alerts_and_insights'
  | 'kibana';

export type ManagementNodeDefinition = NodeDefinitionWithChildren<DeepLinkId, NavigationID>;

export const defaultNavigation: ManagementNodeDefinition = {
  id: 'rootNav:management',
  title: i18n.translate('defaultNavigation.management.sectionLabel', {
    defaultMessage: 'Management',
  }),
  icon: 'gear',
  renderAs: 'accordion',
  children: [
    {
      link: 'monitoring',
    },
    {
      id: 'integration_management',
      title: i18n.translate('defaultNavigation.management.integrationManagement', {
        defaultMessage: 'Integration management',
      }),
      renderAs: 'accordion',
      children: [
        {
          link: 'integrations',
        },
        {
          link: 'fleet',
        },
        {
          link: 'osquery',
        },
      ],
    },
    {
      id: 'stack_management',
      title: i18n.translate('defaultNavigation.management.stackManagement', {
        defaultMessage: 'Stack management',
      }),
      renderAs: 'accordion',
      children: [
        {
          id: 'ingest',
          title: i18n.translate('defaultNavigation.management.ingest', {
            defaultMessage: 'Ingest',
          }),
          renderAs: 'accordion',
          children: [
            {
              link: 'management:ingest_pipelines',
            },
            {
              link: 'management:pipelines',
            },
          ],
        },
        {
          id: 'data',
          title: i18n.translate('defaultNavigation.management.stackManagementData', {
            defaultMessage: 'Data',
          }),
          renderAs: 'accordion',
          children: [
            {
              link: 'management:index_management',
            },
            {
              link: 'management:transform',
            },
          ],
        },
        {
          id: 'alerts_and_insights',
          title: i18n.translate('defaultNavigation.management.alertAndInsights', {
            defaultMessage: 'Alerts and insights',
          }),
          renderAs: 'accordion',
          children: [
            {
              // Rules
              link: 'management:triggersActions',
            },
            {
              link: 'management:cases',
            },
            {
              // Connectors
              link: 'management:triggersActionsConnectors',
            },
            {
              // Machine Learning
              link: 'management:jobsListLink',
            },
          ],
        },
        {
          id: 'kibana',
          title: 'Kibana',
          renderAs: 'accordion',
          children: [
            {
              link: 'management:dataViews',
            },
            {
              link: 'management:aiAssistantManagementSelection',
            },
            {
              // Saved objects
              link: 'management:objects',
            },
            {
              link: 'management:tags',
            },
            {
              link: 'management:spaces',
            },
            {
              // Advanced settings
              link: 'management:settings',
            },
          ],
        },
      ],
    },
  ],
};
