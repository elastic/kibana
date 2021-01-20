/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsClientContract } from '../types';
import { SavedObjectsErrorHelpers } from './lib/errors';

const create = () =>
  (({
    errors: SavedObjectsErrorHelpers,
    create: jest.fn(),
    bulkCreate: jest.fn(),
    checkConflicts: jest.fn(),
    bulkUpdate: jest.fn(),
    delete: jest.fn(),
    bulkGet: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    addToNamespaces: jest.fn(),
    deleteFromNamespaces: jest.fn(),
    removeReferencesTo: jest.fn(),
  } as unknown) as jest.Mocked<SavedObjectsClientContract>);

export const savedObjectsClientMock = { create };
