/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreUsageStatsClient } from '.';

const createUsageStatsClientMock = () =>
  (({
    getUsageStats: jest.fn().mockResolvedValue({}),
    incrementSavedObjectsBulkCreate: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsBulkGet: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsBulkUpdate: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsCreate: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsDelete: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsFind: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsGet: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsResolve: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsUpdate: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsImport: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsResolveImportErrors: jest.fn().mockResolvedValue(null),
    incrementSavedObjectsExport: jest.fn().mockResolvedValue(null),
  } as unknown) as jest.Mocked<CoreUsageStatsClient>);

export const coreUsageStatsClientMock = {
  create: createUsageStatsClientMock,
};
