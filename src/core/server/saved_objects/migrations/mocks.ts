/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectMigrationContext } from './types';
import { SavedObjectsMigrationLogger } from './core';

export const createSavedObjectsMigrationLoggerMock = (): jest.Mocked<SavedObjectsMigrationLogger> => {
  const mock = {
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  return mock;
};

const createContextMock = (): jest.Mocked<SavedObjectMigrationContext> => {
  const mock = {
    log: createSavedObjectsMigrationLoggerMock(),
  };
  return mock;
};

export const migrationMocks = {
  createContext: createContextMock,
};
