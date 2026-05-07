/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UI_SETTINGS } from '../../../common/constants';
import { coreServices } from '../../services/kibana_services';

/**
 * Reads the `dashboard:allowEditingManagedDashboards` advanced setting.
 *
 * The setting is marked `requiresPageReload: true`, so the value is stable for
 * the lifetime of the page — no subscription / memoization beyond what
 * `coreServices.uiSettings` already provides is needed.
 */
export const useAllowEditingManagedDashboards = (): boolean => {
  return coreServices.uiSettings.get<boolean>(UI_SETTINGS.ALLOW_EDITING_MANAGED_DASHBOARDS, false);
};
