/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  DashboardCapabilities,
  DashboardLocatorParams,
  DashboardSettings,
  DashboardState,
  SharedDashboardState,
} from './types';

export type { DashboardPanelMap, DashboardPanelState } from './dashboard_container/types';

export { type InjectExtractDeps } from './dashboard_saved_object/persistable_state/dashboard_saved_object_references';
