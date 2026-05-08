/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { ManagementPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new ManagementPlugin(initializerContext);
}

export type { RegisterManagementAppArgs } from './utils';
export { ManagementSection, ManagementApp } from './utils';

export type {
  ManagementAppMountParams,
  ManagementSetup,
  ManagementStart,
  DefinedSections,
  AutoOpsStatusHook,
  AutoOpsStatusResult,
  LandingQuickActionOverlayProps,
  LandingQuickActionOverlayRenderer,
} from './types';

export { MANAGEMENT_APP_ID } from '../common/contants';
export {
  INDEX_CREATE_LANDING_OVERLAY_ID,
  CONNECTORS_LANDING_OVERLAY_ID,
  SAVED_OBJECTS_IMPORT_LANDING_OVERLAY_ID,
  DATA_VIEWS_CREATE_LANDING_OVERLAY_ID,
  API_KEYS_CREATE_LANDING_OVERLAY_ID,
  ALERTING_RULE_CREATE_LANDING_OVERLAY_ID,
  USER_CREATE_LANDING_OVERLAY_ID,
} from '../common/landing_quick_action_overlay_ids';
