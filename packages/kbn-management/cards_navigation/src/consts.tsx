/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
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
    icon: 'indexSettings',
  },
  [AppIds.TRANSFORM]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.transformDescription', {
      defaultMessage: 'Pivot your data or copy the latest documents into an entity-centric index.',
    }),
    icon: 'indexFlush',
  },
  [AppIds.INGEST_PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate(
      'management.landing.withCardNavigation.ingestPipelinesDescription',
      {
        defaultMessage: 'Remove fields, extract values, and perform transformations on your data.',
      }
    ),
    icon: 'logstashInput',
  },
  [AppIds.DATA_VIEWS]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.dataViewsDescription', {
      defaultMessage: 'Create and manage the Elasticsearch data you selected for exploration.',
    }),
    icon: 'indexEdit',
  },
  [AppIds.ML]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.mlDescription', {
      defaultMessage:
        'Identify, analyze, and process your data using advanced analysis techniques.',
    }),
    icon: 'indexMapping',
  },
  [AppIds.PIPELINES]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.ingestDescription', {
      defaultMessage:
        'Manage and view the Logstash event processing pipeline from inputs to outputs.',
    }),
    icon: 'logstashQueue',
  },
  [AppIds.DATA_QUALITY]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.dataQualityDescription', {
      defaultMessage: 'Find and manage quality issues in your log data.',
    }),
    icon: 'documents',
  },

  [AppIds.DATA_USAGE]: {
    category: appCategories.DATA,
    description: i18n.translate('management.landing.withCardNavigation.dataUsageDescription', {
      defaultMessage: 'View data usage and retention.',
    }),
    icon: 'documents',
  },

  [AppIds.RULES]: {
    category: appCategories.ALERTS,
    description: i18n.translate('management.landing.withCardNavigation.rulesDescription', {
      defaultMessage: 'Define when to generate alerts and notifications.',
    }),
    icon: 'editorChecklist',
  },
  [AppIds.CONNECTORS]: {
    category: appCategories.ALERTS,
    description: i18n.translate('management.landing.withCardNavigation.connectorsDescription', {
      defaultMessage: 'Configure connections to third party systems for use in cases and rules.',
    }),
    icon: 'desktop',
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
    icon: 'wrench',
  },

  [AppIds.SPACES]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.spacesDescription', {
      defaultMessage: 'Organize your saved objects into meaningful categories.',
    }),
    icon: 'spaces',
  },
  [AppIds.SAVED_OBJECTS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.objectsDescription', {
      defaultMessage: 'Manage your saved dashboards, visualizations, maps, and data views.',
    }),
    icon: 'save',
  },
  [AppIds.FILES_MANAGEMENT]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.fileManagementDescription', {
      defaultMessage: 'Access all files that you uploaded.',
    }),
    icon: 'documents',
  },
  [AppIds.REPORTING]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.reportingDescription', {
      defaultMessage: 'Manage generated CSV reports.',
    }),
    icon: 'visPie',
  },
  [AppIds.TAGS]: {
    category: appCategories.CONTENT,
    description: i18n.translate('management.landing.withCardNavigation.tagsDescription', {
      defaultMessage: 'Organize, search, and filter your saved objects by specific criteria.',
    }),
    icon: 'tag',
  },

  [AppIds.SERVERLESS_SETTINGS]: {
    category: appCategories.OTHER,
    description: i18n.translate('management.landing.withCardNavigation.settingsDescription', {
      defaultMessage: 'Control project behavior, such as date display and default sorting.',
    }),
    icon: 'gear',
  },

  // Access section
  [AppIds.API_KEYS]: {
    category: appCategories.ACCESS,
    description: i18n.translate('management.landing.withCardNavigation.apiKeysDescription', {
      defaultMessage: 'Allow programmatic access to your project data and capabilities.',
    }),
    icon: 'lockOpen',
  },
  [AppIds.ROLES]: {
    category: appCategories.ACCESS,
    description: i18n.translate('management.landing.withCardNavigation.rolesDescription', {
      defaultMessage:
        'Create roles unique to this project and combine the exact set of privileges that your users need.',
    }),
    icon: 'usersRolesApp',
  },
};
