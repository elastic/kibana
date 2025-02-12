/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';

const createUsageStatsClientMock = () =>
  ({
    getUsageStats: jest.fn().mockResolvedValue({}),
    getDeprecatedApiUsageStats: jest.fn().mockResolvedValue([]),
    incrementSavedObjectsBulkCreate: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsBulkGet: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsBulkResolve: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsBulkUpdate: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsBulkDelete: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsCreate: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsDelete: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsFind: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsGet: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsResolve: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsUpdate: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsImport: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsResolveImportErrors: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsExport: jest.fn().mockResolvedValue(null),
    incrementLegacyDashboardsImport: jest.fn().mockResolvedValue(null),
    incrementLegacyDashboardsExport: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<ICoreUsageStatsClient>);

export const coreUsageStatsClientMock = {
  create: createUsageStatsClientMock,
};
