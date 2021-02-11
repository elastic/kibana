/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectsRepository } from './repository';

const create = (): jest.Mocked<ISavedObjectsRepository> => ({
  checkConflicts: jest.fn(),
  create: jest.fn(),
  bulkCreate: jest.fn(),
  bulkUpdate: jest.fn(),
  delete: jest.fn(),
  bulkGet: jest.fn(),
  find: jest.fn(),
  get: jest.fn(),
  closePointInTime: jest.fn(),
  openPointInTimeForType: jest.fn().mockResolvedValue({ id: 'some_pit_id' }),
  resolve: jest.fn(),
  update: jest.fn(),
  addToNamespaces: jest.fn(),
  deleteFromNamespaces: jest.fn(),
  deleteByNamespace: jest.fn(),
  incrementCounter: jest.fn(),
  removeReferencesTo: jest.fn(),
});

export const savedObjectsRepositoryMock = { create };
