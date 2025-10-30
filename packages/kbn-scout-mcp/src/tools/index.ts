/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Browser automation tools
export {
  scoutNavigate,
  scoutClick,
  scoutType,
  scoutSnapshot,
  scoutScreenshot,
  scoutWaitFor,
  scoutGetUrl,
  scoutGetTitle,
  scoutGoBack,
  scoutGoForward,
  scoutReload,
} from './browser';

// Authentication tools
export { scoutLogin, scoutLogout, scoutGetAuthStatus, scoutSetSessionCookie } from './auth';

// Page object tools
export { scoutPageObject, scoutListPageObjects, scoutGetPageObjectState } from './page_objects';

// EUI component tools
export { scoutEuiComponent, scoutListEuiComponents } from './eui';

// API service tools
export { scoutApiService, scoutListApiServices } from './api';

// Fixture tools
export {
  scoutEsQuery,
  scoutKibanaApi,
  scoutEsArchiver,
  scoutGetConfig,
  scoutListFixtures,
} from './fixtures';
