/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export * from './auth';
export * from './error';
export { enableFleetSpaceAwareness } from './services/fleet_services';
export { isLocalhost } from './services/is_localhost';
export { fetchKibanaStatus, isServerlessKibanaFlavor } from './services/kibana_status';
export { getLocalhostRealIp } from './services/network_services';
export { createSecuritySuperuser } from './services/security_user_services';
export type { CreatedSecuritySuperuser } from './services/security_user_services';
export { createRuntimeServices } from './services/stack_services';
export { waitForAlertsToPopulate } from './services/alerting_services';
export * from './api';
export { createToolingLogger } from './logger';
export * from './utils';
