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

import { AppDefinition } from './types';

export enum appIds {
  INGEST_PIPELINES = 'ingest_pipelines',
  PIPELINES = 'pipelines',
  INDEX_MANAGEMENT = 'index_management',
  TRANSFORM = 'transform',
  ML = 'jobsListLink',
  SAVED_OBJECTS = 'objects',
  TAGS = 'tags',
  FILES_MANAGEMENT = 'filesManagement',
  API_KEYS = 'api_keys',
  DATA_VIEWS = 'dataViews',
  REPORTING = 'reporting',
  CONNECTORS = 'triggersActionsConnectors',
  RULES = 'triggersActions',
  MAINTENANCE_WINDOWS = 'maintenanceWindows',
}

// Create new type that is a union of all the appId values
export type AppId = `${appIds}`;

export const appCategories = {
  DATA: 'data',
  ALERTS: 'alerts',
  CONTENT: 'content',
  OTHER: 'other',
};

export const appDefinitions: Record<AppId, AppDefinition> = {
  [appIds.INDEX_MANAGEMENT]: {
    category: appCategories.DATA,
    description: i18n.translate(
      'management.landing.withCardNavigation.indexmanagementDescription',
      {
        defaultMessage:
          'Configure and maintain your Elasticsearch indices for optimal data storage and retrieval.',
      }
    ),
    icon: <EuiIcon size="l" type="indexSettings" />,
  },
  [appIds.TRANSFORM]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.transformDescription', {
      defaultMessage:
        'Pivot your data or copy the latest documents into an entity-centric index, so you can analyze it in new ways.',
    }),
    icon: <EuiIcon size="l" type="indexFlush" />,
  },
  [appIds.INGEST_PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate(
      'management.landing.withCardNavigation.ingestPipelinesDescription',
      {
        defaultMessage:
          'Remove fields, extract values, and perform other transformations on your data before indexing.',
      }
    ),
    icon: <EuiIcon size="l" type="logstashInput" />,
  },
  [appIds.DATA_VIEWS]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.dataViewsDescription', {
      defaultMessage: 'Create and manage the objects that retrieve data from Elasticsearch.',
    }),
    icon: <EuiIcon size="l" type="indexEdit" />,
  },
  [appIds.ML]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.mlDescription', {
      defaultMessage:
        'Identify, analyze, and process areas of interest in your data using advanced data analysis techniques.',
    }),
    icon: <EuiIcon size="l" type="indexMapping" />,
  },
  [appIds.PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.ingestDescription', {
      defaultMessage:
        'Manage and view the Logstash event processing pipeline from inputs to filters to outputs.',
    }),
    icon: <EuiIcon size="l" type="logstashQueue" />,
  },

  [appIds.RULES]: {
    category: appCategories.ALERTS,
    description: i18n.translate('management.landing.withCardNavigation.rulesDescription', {
      defaultMessage:
        'Define rules, which detect conditions in apps across Kibana and trigger actions when the conditions are met.',
    }),
    icon: <EuiIcon size="l" type="editorChecklist" />,
  },
  [appIds.CONNECTORS]: {
    category: appCategories.ALERTS,
    description: i18n.translate('management.landing.withCardNavigation.connectorsDescription', {
      defaultMessage:
        'Manage your connections with third party systems, which route rule action data to log files, messaging tools, and more.',
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
      defaultMessage:
        'Manage and share your saved dashboards, visualizations, maps, data views, Canvas workpads, and more.',
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
      defaultMessage:
        'Monitor the generation of PDF, PNG, and CSV reports across apps, and then open or download them.',
    }),
    icon: <EuiIcon size="l" type="visPie" />,
  },
  [appIds.TAGS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.tagsDescription', {
      defaultMessage:
        'Assign labels to saved objects so that you can organize, search, and filter them based on specific criteria.',
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
};

// Compose a list of app ids that belong to a given category
export const getAppIdsByCategory = (category: string) => {
  const appKeys = Object.keys(appDefinitions) as AppId[];
  return appKeys.filter((appId: AppId) => {
    return appDefinitions[appId].category === category;
  });
};
