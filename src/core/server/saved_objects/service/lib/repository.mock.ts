/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  update: jest.fn(),
  addToNamespaces: jest.fn(),
  deleteFromNamespaces: jest.fn(),
  deleteByNamespace: jest.fn(),
  incrementCounter: jest.fn(),
  removeReferencesTo: jest.fn(),
});

export const savedObjectsRepositoryMock = { create };
