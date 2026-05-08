/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  INDEX_CREATE_LANDING_OVERLAY_ID,
  ALERTING_RULE_CREATE_LANDING_OVERLAY_ID,
  API_KEYS_CREATE_LANDING_OVERLAY_ID,
  CONNECTORS_LANDING_OVERLAY_ID,
  DATA_VIEWS_CREATE_LANDING_OVERLAY_ID,
  SAVED_OBJECTS_IMPORT_LANDING_OVERLAY_ID,
  USER_CREATE_LANDING_OVERLAY_ID,
} from '../../../../common/landing_quick_action_overlay_ids';

export {
  INDEX_CREATE_LANDING_OVERLAY_ID,
  ALERTING_RULE_CREATE_LANDING_OVERLAY_ID,
  API_KEYS_CREATE_LANDING_OVERLAY_ID,
  CONNECTORS_LANDING_OVERLAY_ID,
  DATA_VIEWS_CREATE_LANDING_OVERLAY_ID,
  SAVED_OBJECTS_IMPORT_LANDING_OVERLAY_ID,
  USER_CREATE_LANDING_OVERLAY_ID,
};

export interface QuickActionDefinition {
  id: string;
  /** Short imperative CTA shown as the card title. */
  title: string;
  /** Subdued helper text under the title. */
  description: string;
  appId: string;
  path: string;
  capabilityPath: string;
  /** When set, open this overlay on the landing page if a renderer was registered; else fall back to `path`. */
  overlayId?: string;
}

export const QUICK_ACTION_DEFINITIONS: QuickActionDefinition[] = [
  {
    id: 'create_index',
    title: i18n.translate('management.landing.quickActions.createIndex', {
      defaultMessage: 'Create an index',
    }),
    description: i18n.translate('management.landing.quickActions.createIndexDescription', {
      defaultMessage:
        'Add a new Elasticsearch index with standard or lookup mode for your data and templates.',
    }),
    appId: 'management',
    path: 'data/index_management',
    overlayId: INDEX_CREATE_LANDING_OVERLAY_ID,
    capabilityPath: 'management.data.index_management',
  },
  {
    id: 'alerting_rules',
    title: i18n.translate('management.landing.quickActions.createAlertingRule', {
      defaultMessage: 'Create alerting rule',
    }),
    description: i18n.translate('management.landing.quickActions.createAlertingRuleDescription', {
      defaultMessage:
        'Select a rule type or template and define when to send notifications about your data.',
    }),
    appId: 'management',
    path: 'insightsAndAlerting/triggersActions',
    overlayId: ALERTING_RULE_CREATE_LANDING_OVERLAY_ID,
    capabilityPath: 'management.insightsAndAlerting.triggersActions',
  },
  {
    id: 'reporting',
    title: i18n.translate('management.landing.quickActions.viewReportingExports', {
      defaultMessage: 'View reporting and exports',
    }),
    description: i18n.translate('management.landing.quickActions.viewReportingExportsDescription', {
      defaultMessage:
        'Download PDF, CSV, and other generated reports from your Elastic environment.',
    }),
    appId: 'management',
    path: 'insightsAndAlerting/reporting/exports',
    capabilityPath: 'management.insightsAndAlerting.reporting',
  },
  {
    id: 'api_keys',
    title: i18n.translate('management.landing.quickActions.createApiKey', {
      defaultMessage: 'Create an API key',
    }),
    description: i18n.translate('management.landing.quickActions.createApiKeyDescription', {
      defaultMessage:
        'Issue credentials for applications and scripts to call Elasticsearch and Kibana APIs.',
    }),
    appId: 'management',
    path: 'security/api_keys/create',
    overlayId: API_KEYS_CREATE_LANDING_OVERLAY_ID,
    capabilityPath: 'management.security.api_keys',
  },
  {
    id: 'data_views',
    title: i18n.translate('management.landing.quickActions.createDataView', {
      defaultMessage: 'Create a data view',
    }),
    description: i18n.translate('management.landing.quickActions.createDataViewDescription', {
      defaultMessage: 'Point Discover, dashboards, and Lens at the indices you want to analyze.',
    }),
    appId: 'management',
    path: 'kibana/dataViews/create',
    overlayId: DATA_VIEWS_CREATE_LANDING_OVERLAY_ID,
    capabilityPath: 'management.kibana.indexPatterns',
  },
  {
    id: 'connectors',
    title: i18n.translate('management.landing.quickActions.createConnector', {
      defaultMessage: 'Create a connector',
    }),
    description: i18n.translate('management.landing.quickActions.createConnectorDescription', {
      defaultMessage:
        'Add an outbound connection for alerting, cases, and third-party integrations.',
    }),
    appId: 'management',
    path: 'insightsAndAlerting/triggersActionsConnectors/connectors',
    overlayId: CONNECTORS_LANDING_OVERLAY_ID,
    capabilityPath: 'management.insightsAndAlerting.triggersActionsConnectors',
  },
  {
    id: 'saved_objects',
    title: i18n.translate('management.landing.quickActions.importSavedObjects', {
      defaultMessage: 'Import saved objects',
    }),
    description: i18n.translate('management.landing.quickActions.importSavedObjectsDescription', {
      defaultMessage:
        'Upload a file to add dashboards, maps, saved searches, and other objects to this space.',
    }),
    appId: 'management',
    path: 'kibana/objects',
    overlayId: SAVED_OBJECTS_IMPORT_LANDING_OVERLAY_ID,
    capabilityPath: 'management.kibana.objects',
  },
  {
    id: 'users',
    title: i18n.translate('management.landing.quickActions.addUser', {
      defaultMessage: 'Add a user',
    }),
    description: i18n.translate('management.landing.quickActions.addUserDescription', {
      defaultMessage: 'Invite people to Elastic and control access with roles and privileges.',
    }),
    appId: 'management',
    path: 'security/users/create',
    overlayId: USER_CREATE_LANDING_OVERLAY_ID,
    capabilityPath: 'management.security.users',
  },
];
