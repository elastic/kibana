/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { convertNumberToDashboardVersion } from '../services/dashboard_content_management/lib/dashboard_versioning';

export const DASHBOARD_CONTAINER_TYPE = 'dashboard';

export const LATEST_DASHBOARD_CONTAINER_VERSION = convertNumberToDashboardVersion(1);

export type { DashboardContainer } from './embeddable/dashboard_container';
export {
  type DashboardContainerFactory,
  type DashboardCreationOptions,
  DashboardContainerFactoryDefinition,
} from './embeddable/dashboard_container_factory';

export { DashboardRenderer } from './external_api/dashboard_renderer';
export type { DashboardAPI, AwaitingDashboardAPI } from './external_api/dashboard_api';
export type { DashboardLocatorParams } from './types';
