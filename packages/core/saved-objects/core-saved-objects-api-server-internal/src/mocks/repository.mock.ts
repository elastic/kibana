/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';

// mock duplicated from `@kbn/core/saved-objects-api-server-mocks` to avoid cyclic dependencies

const createRepositoryMock = () => {
  const mock: jest.Mocked<ISavedObjectsRepository> = {
    checkConflicts: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    bulkUpdate: jest.fn(),
    bulkDelete: jest.fn(),
    delete: jest.fn(),
    bulkGet: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    closePointInTime: jest.fn(),
    createPointInTimeFinder: jest.fn(),
    openPointInTimeForType: jest.fn().mockResolvedValue({ id: 'some_pit_id' }),
    bulkResolve: jest.fn(),
    resolve: jest.fn(),
    update: jest.fn(),
    deleteByNamespace: jest.fn(),
    incrementCounter: jest.fn(),
    removeReferencesTo: jest.fn(),
    collectMultiNamespaceReferences: jest.fn(),
    updateObjectsSpaces: jest.fn(),
  };

  return mock;
};

export const repositoryMock = {
  create: createRepositoryMock,
};
