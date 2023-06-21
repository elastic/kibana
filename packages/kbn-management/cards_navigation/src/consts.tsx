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

export const appIds = {
  INGEST_PIPELINES: 'ingest_pipelines',
  PIPELINES: 'pipelines',
  INDEX_MANAGEMENT: 'index_management',
  TRANSFORM: 'transform',
  ML: 'jobsListLink',
  DATA_VIEW: 'data_view',
  SAVED_OBJECTS: 'objects',
  TAGS: 'tags',
  FILES_MANAGEMENT: 'filesManagement',
  API_KEYS: 'api_keys',
  ADVANCED_SETTINGS: 'settings',
};

export const appCategories = {
  DATA: 'data',
  CONTENT: 'content',
  OTHER: 'other',
};

export const appDefinitions = {
  [appIds.INGEST_PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate(
      'management.landing.withCardNavigation.ingestPipelinesDescription',
      {
        defaultMessage:
          'Use pipelines to remove or transform fields, extract values from text, and enrich your data before indexing.',
      }
    ),
    icon: <EuiIcon size="l" type="managementApp" />,
  },
  [appIds.PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.ingestDescription', {
      defaultMessage: 'Manage Logstash event processing and see the result visually.',
    }),
    icon: <EuiIcon size="l" type="logsApp" />,
  },
  [appIds.INDEX_MANAGEMENT]: {
    category: appCategories.DATA,
    description: i18n.translate(
      'management.landing.withCardNavigation.indexmanagementDescription',
      {
        defaultMessage: 'Update your Elasticsearch indices individually or in bulk.',
      }
    ),
    icon: <EuiIcon size="l" type="indexManagementApp" />,
  },
  [appIds.TRANSFORM]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.transformDescription', {
      defaultMessage:
        'Transforms pivot indices into summarized, entity-centric indices, or create an indexed view of the latest documents.',
    }),
    icon: <EuiIcon size="l" type="managementApp" />,
  },
  [appIds.ML]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.mlDescription', {
      defaultMessage:
        'View, export, and import machine learning analytics and anomaly detection items.',
    }),
    icon: <EuiIcon size="l" type="machineLearningApp" />,
  },
  [appIds.DATA_VIEW]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.dataViewsDescription', {
      defaultMessage:
        'Create and manage the data views that help you retrieve your data from Elasticsearch.',
    }),
    icon: <EuiIcon size="l" type="managementApp" />,
  },
  [appIds.SAVED_OBJECTS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.objectsDescription', {
      defaultMessage:
        'Manage and share your saved objects. To edit the underlying data of an object, go to its associated application.',
    }),
    icon: <EuiIcon size="l" type="savedObjectsApp" />,
  },
  [appIds.TAGS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.tagsDescription', {
      defaultMessage: 'Use tags to categorize and easily find your objects.',
    }),
    icon: <EuiIcon size="l" type="managementApp" />,
  },
  [appIds.FILES_MANAGEMENT]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.fileManagementDescription', {
      defaultMessage: 'Any files created will be listed here.',
    }),
    icon: <EuiIcon size="l" type="indexManagementApp" />,
  },
  [appIds.API_KEYS]: {
    category: appCategories.OTHER,
    description: i18n.translate('management.landing.withCardNavigation.apiKeysDescription', {
      defaultMessage: 'Allow applications to access Elastic on your behalf.',
    }),
    icon: <EuiIcon size="l" type="managementApp" />,
  },
  [appIds.ADVANCED_SETTINGS]: {
    category: appCategories.OTHER,
    description: i18n.translate(
      'management.landing.withCardNavigation.advancedSettingsDescription',
      {
        defaultMessage: 'Settings intended for advanced users.',
      }
    ),
    icon: <EuiIcon size="l" type="logsApp" />,
  },
};

export const getAppIdsByCategory = (category: string) => {
  return Object.keys(appDefinitions).filter((appId) => {
    return appDefinitions[appId].category === category;
  });
};
