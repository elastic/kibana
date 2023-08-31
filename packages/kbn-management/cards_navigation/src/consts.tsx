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
        defaultMessage: 'Update your Elasticsearch indices individually or in bulk.',
      }
    ),
    icon: <EuiIcon size="l" type="indexSettings" />,
  },
  [appIds.TRANSFORM]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.transformDescription', {
      defaultMessage:
        'Transforms pivot indices into summarized, entity-centric indices, or create an indexed view of the latest documents.',
    }),
    icon: <EuiIcon size="l" type="indexFlush" />,
  },
  [appIds.INGEST_PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate(
      'management.landing.withCardNavigation.ingestPipelinesDescription',
      {
        defaultMessage:
          'Use pipelines to remove or transform fields, extract values from text, and enrich your data before indexing.',
      }
    ),
    icon: <EuiIcon size="l" type="logstashInput" />,
  },
  [appIds.DATA_VIEWS]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.dataViewsDescription', {
      defaultMessage:
        'Create and manage the data views that help you retrieve your data from Elasticsearch.',
    }),
    icon: <EuiIcon size="l" type="indexEdit" />,
  },
  [appIds.ML]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.mlDescription', {
      defaultMessage:
        'View, export, and import machine learning analytics and anomaly detection items.',
    }),
    icon: <EuiIcon size="l" type="indexMapping" />,
  },
  [appIds.PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.ingestDescription', {
      defaultMessage: 'Manage Logstash event processing and see the result visually.',
    }),
    icon: <EuiIcon size="l" type="logstashQueue" />,
  },

  [appIds.RULES]: {
    category: appCategories.ALERTS,
    description: i18n.translate('management.landing.withCardNavigation.rulesDescription', {
      defaultMessage: 'Detect conditions using rules.',
    }),
    icon: <EuiIcon size="l" type="editorChecklist" />,
  },
  [appIds.CONNECTORS]: {
    category: appCategories.ALERTS,
    description: i18n.translate('management.landing.withCardNavigation.connectorsDescription', {
      defaultMessage: 'Connect third-party software with your alerting data.',
    }),
    icon: <EuiIcon size="l" type="desktop" />,
  },
  [appIds.MAINTENANCE_WINDOWS]: {
    category: appCategories.ALERTS,
    description: i18n.translate(
      'management.landing.withCardNavigation.maintenanceWindowsDescription',
      {
        defaultMessage: 'Suppress rule notifications for scheduled periods of time.',
      }
    ),
    icon: <EuiIcon size="l" type="wrench" />,
  },

  [appIds.SAVED_OBJECTS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.objectsDescription', {
      defaultMessage:
        'Manage and share your saved objects. To edit the underlying data of an object, go to its associated application.',
    }),
    icon: <EuiIcon size="l" type="save" />,
  },
  [appIds.FILES_MANAGEMENT]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.fileManagementDescription', {
      defaultMessage: 'Any files created will be listed here.',
    }),
    icon: <EuiIcon size="l" type="documents" />,
  },
  [appIds.REPORTING]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.reportingDescription', {
      defaultMessage: 'Get reports generated in applications.',
    }),
    icon: <EuiIcon size="l" type="visPie" />,
  },
  [appIds.TAGS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.tagsDescription', {
      defaultMessage: 'Use tags to categorize and easily find your objects.',
    }),
    icon: <EuiIcon size="l" type="tag" />,
  },

  [appIds.API_KEYS]: {
    category: appCategories.OTHER,
    description: i18n.translate('management.landing.withCardNavigation.apiKeysDescription', {
      defaultMessage: 'Allow applications to access Elastic on your behalf.',
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
