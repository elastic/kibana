/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectMigrationContext,
  SavedObjectsMigrationLogger,
} from '@kbn/core-saved-objects-server';

export const createSavedObjectsMigrationLoggerMock =
  (): jest.Mocked<SavedObjectsMigrationLogger> => {
    const mock = {
      debug: jest.fn(),
      info: jest.fn(),
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
