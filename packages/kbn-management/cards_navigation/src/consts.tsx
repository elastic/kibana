/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon } from '@elastic/eui';

import { appIds, AppId, AppDefinition, appCategories } from './types';

export { appIds, appCategories } from './types';

export const appDefinitions: Record<AppId, AppDefinition> = {
  [appIds.INDEX_MANAGEMENT]: {
    category: appCategories.DATA,
    description: i18n.translate(
      'management.landing.withCardNavigation.indexmanagementDescription',
      {
        defaultMessage:
          'Configure and maintain your Elasticsearch indices for data storage and retrieval.',
      }
    ),
    icon: <EuiIcon size="l" type="indexSettings" />,
  },
  [appIds.TRANSFORM]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.transformDescription', {
      defaultMessage: 'Pivot your data or copy the latest documents into an entity-centric index.',
    }),
    icon: <EuiIcon size="l" type="indexFlush" />,
  },
  [appIds.INGEST_PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate(
      'management.landing.withCardNavigation.ingestPipelinesDescription',
      {
        defaultMessage: 'Remove fields, extract values, and perform transformations on your data.',
      }
    ),
    icon: <EuiIcon size="l" type="logstashInput" />,
  },
  [appIds.DATA_VIEWS]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.dataViewsDescription', {
      defaultMessage: 'Create and manage the Elasticsearch data you selected for exploration.',
    }),
    icon: <EuiIcon size="l" type="indexEdit" />,
  },
  [appIds.ML]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.mlDescription', {
      defaultMessage:
        'Identify, analyze, and process your data using advanced analysis techniques.',
    }),
    icon: <EuiIcon size="l" type="indexMapping" />,
  },
  [appIds.PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.ingestDescription', {
      defaultMessage:
        'Manage and view the Logstash event processing pipeline from inputs to outputs.',
    }),
    icon: <EuiIcon size="l" type="logstashQueue" />,
  },

  [appIds.RULES]: {
    category: appCategories.ALERTS,
    description: i18n.translate('management.landing.withCardNavigation.rulesDescription', {
      defaultMessage: 'Define when to generate alerts and notifications.',
    }),
    icon: <EuiIcon size="l" type="editorChecklist" />,
  },
  [appIds.CONNECTORS]: {
    category: appCategories.ALERTS,
    description: i18n.translate('management.landing.withCardNavigation.connectorsDescription', {
      defaultMessage: 'Configure connections to third party systems for use in cases and rules.',
    }),
    icon: <EuiIcon size="l" type="desktop" />,
  },
  [appIds.MAINTENANCE_WINDOWS]: {
    category: appCategories.ALERTS,
    description: i18n.translate(
      'management.landing.withCardNavigation.maintenanceWindowsDescription',
      {
        defaultMessage:
          'Suppress rule notifications during scheduled times for maintenance, updates, and other system tasks.',
      }
    ),
    icon: <EuiIcon size="l" type="wrench" />,
  },

  [appIds.SAVED_OBJECTS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.objectsDescription', {
      defaultMessage: 'Manage your saved dashboards, maps, data views, and Canvas workpads.',
    }),
    icon: <EuiIcon size="l" type="save" />,
  },
  [appIds.FILES_MANAGEMENT]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.fileManagementDescription', {
      defaultMessage: 'Access all files that you uploaded.',
    }),
    icon: <EuiIcon size="l" type="documents" />,
  },
  [appIds.REPORTING]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.reportingDescription', {
      defaultMessage: 'Manage generated PDF, PNG and CSV reports.',
    }),
    icon: <EuiIcon size="l" type="visPie" />,
  },
  [appIds.TAGS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.tagsDescription', {
      defaultMessage: 'Organize, search, and filter your saved objects by specific criteria.',
    }),
    icon: <EuiIcon size="l" type="tag" />,
  },

  [appIds.API_KEYS]: {
    category: appCategories.OTHER,
    description: i18n.translate('management.landing.withCardNavigation.apiKeysDescription', {
      defaultMessage: 'Allow programmatic access to your project data and capabilities.',
    }),
    icon: <EuiIcon size="l" type="lockOpen" />,
  },

  [appIds.SERVERLESS_SETTINGS]: {
    category: appCategories.OTHER,
    description: i18n.translate('management.landing.withCardNavigation.settingsDescription', {
      defaultMessage: 'Control project behavior, such as date display and default sorting.',
    }),
    icon: <EuiIcon size="l" type="gear" />,
  },
};

// Compose a list of app ids that belong to a given category
export const getAppIdsByCategory = (category: string) => {
  const appKeys = Object.keys(appDefinitions) as AppId[];
  return appKeys.filter((appId: AppId) => {
    return appDefinitions[appId].category === category;
  });
};
