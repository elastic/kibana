/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const DASHBOARD_CONTAINER_TYPE = 'dashboard';

/**
 * This version MUST parse into a number type, or else the Dashboard will not
 * properly save. This is because the version information in the Dashboard
 * attributes is number typed.
 */
export const LATEST_DASHBOARD_CONTAINER_VERSION = '1';

export type { DashboardContainer } from './embeddable/dashboard_container';
export {
  type DashboardContainerFactory,
  type DashboardCreationOptions,
  DashboardContainerFactoryDefinition,
} from './embeddable/dashboard_container_factory';

export { DashboardRenderer } from './external_api/dashboard_renderer';
export type { DashboardAPI, AwaitingDashboardAPI } from './external_api/dashboard_api';
