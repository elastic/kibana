/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, Mocked } from 'vitest';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';

// mock duplicated from `@kbn/core/saved-objects-api-server-mocks` to avoid cyclic dependencies

const createRepositoryMock = () => {
  const mock: Mocked<ISavedObjectsRepository> = {
    checkConflicts: vi.fn(),
    create: vi.fn() as Mock,
    bulkCreate: vi.fn() as Mock,
    bulkUpdate: vi.fn(),
    bulkDelete: vi.fn(),
    delete: vi.fn(),
    bulkGet: vi.fn() as Mock,
    find: vi.fn() as Mock,
    search: vi.fn() as Mock,
    esql: vi.fn(),
    get: vi.fn() as Mock,
    closePointInTime: vi.fn(),
    createPointInTimeFinder: vi.fn() as Mock,
    openPointInTimeForType: vi.fn().mockResolvedValue({ id: 'some_pit_id' }),
    bulkResolve: vi.fn() as Mock,
    resolve: vi.fn() as Mock,
    update: vi.fn(),
    deleteByNamespace: vi.fn(),
    incrementCounter: vi.fn() as Mock,
    removeReferencesTo: vi.fn(),
    collectMultiNamespaceReferences: vi.fn(),
    updateObjectsSpaces: vi.fn(),
    getCurrentNamespace: vi.fn(),
    asScopedToNamespace: vi.fn().mockImplementation(createRepositoryMock),
    changeOwnership: vi.fn(),
    changeAccessMode: vi.fn(),
  };

  return mock;
};

export const repositoryMock = {
  create: createRepositoryMock,
};
