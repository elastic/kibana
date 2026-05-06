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
  API_KEYS_CREATE_LANDING_OVERLAY_ID,
  CONNECTORS_LANDING_OVERLAY_ID,
  DATA_VIEWS_CREATE_LANDING_OVERLAY_ID,
  SAVED_OBJECTS_IMPORT_LANDING_OVERLAY_ID,
} from '../../../../common/landing_quick_action_overlay_ids';

export {
  API_KEYS_CREATE_LANDING_OVERLAY_ID,
  CONNECTORS_LANDING_OVERLAY_ID,
  DATA_VIEWS_CREATE_LANDING_OVERLAY_ID,
  SAVED_OBJECTS_IMPORT_LANDING_OVERLAY_ID,
};

export interface QuickActionDefinition {
  id: string;
  title: string;
  icon: string;
  appId: string;
  path: string;
  capabilityPath: string;
  /** When set, open this overlay on the landing page if a renderer was registered; else fall back to `path`. */
  overlayId?: string;
}

export const QUICK_ACTION_DEFINITIONS: QuickActionDefinition[] = [
  {
    id: 'index_management',
    title: i18n.translate('management.landing.quickActions.manageIndices', {
      defaultMessage: 'Manage Indices',
    }),
    icon: 'indexManagementApp',
    appId: 'management',
    path: 'data/index_management',
    capabilityPath: 'management.data.index_management',
  },
  {
    id: 'alerting_rules',
    title: i18n.translate('management.landing.quickActions.alertingRules', {
      defaultMessage: 'Alerting Rules',
    }),
    icon: 'bell',
    appId: 'management',
    path: 'insightsAndAlerting/triggersActions',
    capabilityPath: 'management.insightsAndAlerting.triggersActions',
  },
  {
    id: 'reporting',
    title: i18n.translate('management.landing.quickActions.reportingExports', {
      defaultMessage: 'Reporting & Exports',
    }),
    icon: 'reportingApp',
    appId: 'management',
    path: 'insightsAndAlerting/reporting/exports',
    capabilityPath: 'management.insightsAndAlerting.reporting',
  },
  {
    id: 'api_keys',
    title: i18n.translate('management.landing.quickActions.apiKeys', {
      defaultMessage: 'API Keys',
    }),
    icon: 'lockOpen',
    appId: 'management',
    path: 'security/api_keys/create',
    overlayId: API_KEYS_CREATE_LANDING_OVERLAY_ID,
    capabilityPath: 'management.security.api_keys',
  },
  {
    id: 'data_views',
    title: i18n.translate('management.landing.quickActions.dataViews', {
      defaultMessage: 'Data Views',
    }),
    icon: 'indexPatternApp',
    appId: 'management',
    path: 'kibana/dataViews/create',
    overlayId: DATA_VIEWS_CREATE_LANDING_OVERLAY_ID,
    capabilityPath: 'management.kibana.indexPatterns',
  },
  {
    id: 'connectors',
    title: i18n.translate('management.landing.quickActions.connectors', {
      defaultMessage: 'Connectors',
    }),
    icon: 'plugs',
    appId: 'management',
    path: 'insightsAndAlerting/triggersActionsConnectors/connectors',
    overlayId: CONNECTORS_LANDING_OVERLAY_ID,
    capabilityPath: 'management.insightsAndAlerting.triggersActionsConnectors',
  },
  {
    id: 'saved_objects',
    title: i18n.translate('management.landing.quickActions.savedObjects', {
      defaultMessage: 'Saved Objects',
    }),
    icon: 'savedObjectsApp',
    appId: 'management',
    path: 'kibana/objects',
    overlayId: SAVED_OBJECTS_IMPORT_LANDING_OVERLAY_ID,
    capabilityPath: 'management.kibana.objects',
  },
  {
    id: 'users',
    title: i18n.translate('management.landing.quickActions.usersRoles', {
      defaultMessage: 'Users & Roles',
    }),
    icon: 'usersRolesApp',
    appId: 'management',
    path: 'security/users/create',
    capabilityPath: 'management.security.users',
  },
];
