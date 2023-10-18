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

import { AppIds, AppId, AppDefinition, appCategories } from './types';

export { AppIds, appCategories } from './types';

export const appDefinitions: Record<AppId, AppDefinition> = {
  [AppIds.INDEX_MANAGEMENT]: {
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
  [AppIds.TRANSFORM]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.transformDescription', {
      defaultMessage: 'Pivot your data or copy the latest documents into an entity-centric index.',
    }),
    icon: <EuiIcon size="l" type="indexFlush" />,
  },
  [AppIds.INGEST_PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate(
      'management.landing.withCardNavigation.ingestPipelinesDescription',
      {
        defaultMessage: 'Remove fields, extract values, and perform transformations on your data.',
      }
    ),
    icon: <EuiIcon size="l" type="logstashInput" />,
  },
  [AppIds.DATA_VIEWS]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.dataViewsDescription', {
      defaultMessage: 'Create and manage the Elasticsearch data you selected for exploration.',
    }),
    icon: <EuiIcon size="l" type="indexEdit" />,
  },
  [AppIds.ML]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.mlDescription', {
      defaultMessage:
        'Identify, analyze, and process your data using advanced analysis techniques.',
    }),
    icon: <EuiIcon size="l" type="indexMapping" />,
  },
  [AppIds.PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.ingestDescription', {
      defaultMessage:
        'Manage and view the Logstash event processing pipeline from inputs to outputs.',
    }),
    icon: <EuiIcon size="l" type="logstashQueue" />,
  },

  [AppIds.RULES]: {
    category: appCategories.ALERTS,
    description: i18n.translate('management.landing.withCardNavigation.rulesDescription', {
      defaultMessage: 'Define when to generate alerts and notifications.',
    }),
    icon: <EuiIcon size="l" type="editorChecklist" />,
  },
  [AppIds.CONNECTORS]: {
    category: appCategories.ALERTS,
    description: i18n.translate('management.landing.withCardNavigation.connectorsDescription', {
      defaultMessage: 'Configure connections to third party systems for use in cases and rules.',
    }),
    icon: <EuiIcon size="l" type="desktop" />,
  },
  [AppIds.MAINTENANCE_WINDOWS]: {
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

  [AppIds.SAVED_OBJECTS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.objectsDescription', {
      defaultMessage: 'Manage your saved dashboards, maps, data views, and Canvas workpads.',
    }),
    icon: <EuiIcon size="l" type="save" />,
  },
  [AppIds.FILES_MANAGEMENT]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.fileManagementDescription', {
      defaultMessage: 'Access all files that you uploaded.',
    }),
    icon: <EuiIcon size="l" type="documents" />,
  },
  [AppIds.REPORTING]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.reportingDescription', {
      defaultMessage: 'Manage generated PDF, PNG and CSV reports.',
    }),
    icon: <EuiIcon size="l" type="visPie" />,
  },
  [AppIds.TAGS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.tagsDescription', {
      defaultMessage: 'Organize, search, and filter your saved objects by specific criteria.',
    }),
    icon: <EuiIcon size="l" type="tag" />,
  },

  [AppIds.API_KEYS]: {
    category: appCategories.OTHER,
    description: i18n.translate('management.landing.withCardNavigation.apiKeysDescription', {
      defaultMessage: 'Allow programmatic access to your project data and capabilities.',
    }),
    icon: <EuiIcon size="l" type="lockOpen" />,
  },

  [AppIds.SERVERLESS_SETTINGS]: {
    category: appCategories.OTHER,
    description: i18n.translate('management.landing.withCardNavigation.settingsDescription', {
      defaultMessage: 'Control project behavior, such as date display and default sorting.',
    }),
    icon: <EuiIcon size="l" type="gear" />,
  },
};
