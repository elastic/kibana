/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectMigrationContext } from './types';
import { SavedObjectsMigrationLogger } from './core';

export const createSavedObjectsMigrationLoggerMock =
  (): jest.Mocked<SavedObjectsMigrationLogger> => {
    const mock = {
      debug: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    return mock;
  };

const createContextMock = ({
  migrationVersion = '8.0.0',
  convertToMultiNamespaceTypeVersion,
  isSingleNamespaceType = false,
}: {
  migrationVersion?: string;
  convertToMultiNamespaceTypeVersion?: string;
  isSingleNamespaceType?: boolean;
} = {}): jest.Mocked<SavedObjectMigrationContext> => {
  const mock = {
    log: createSavedObjectsMigrationLoggerMock(),
    migrationVersion,
    convertToMultiNamespaceTypeVersion,
    isSingleNamespaceType,
  };
  return mock;
};

export const migrationMocks = {
  createContext: createContextMock,
};
