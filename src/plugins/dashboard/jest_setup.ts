/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * CAUTION: Be very mindful of the things you import in to this `jest_setup` file - anything that is imported
 * here (either directly or implicitly through dependencies) will be **unable** to be mocked elsewhere!
 *
 * Refer to the "Caution" section here:
 *   https://jestjs.io/docs/jest-object#jestmockmodulename-factory-options
 */
import {
  mockDashboardBackupService,
  mockDashboardContentManagementCache,
  mockDashboardContentManagementService,
  setStubKibanaServices,
} from './public/services/mocks';

// Start the kibana services with stubs
setStubKibanaServices();

// Mock the dashboard services
jest.mock('./public/services/dashboard_content_management_service', () => {
  return {
    getDashboardContentManagementCache: () => mockDashboardContentManagementCache,
    getDashboardContentManagementService: () => mockDashboardContentManagementService,
  };
});

jest.mock('./public/services/dashboard_backup_service', () => {
  return {
    getDashboardBackupService: () => mockDashboardBackupService,
  };
});

jest.mock('./public/services/dashboard_recently_accessed_service', () => {
  return {
    getDashboardRecentlyAccessedService: () => ({
      add: jest.fn(),
      get: jest.fn(),
      get$: jest.fn(),
    }),
  };
});
