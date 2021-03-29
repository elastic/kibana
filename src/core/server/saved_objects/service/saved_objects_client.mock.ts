/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '../types';
import { SavedObjectsErrorHelpers } from './lib/errors';
import { savedObjectsPointInTimeFinderMock } from './lib/point_in_time_finder.mock';

const create = () => {
  const mock = ({
    errors: SavedObjectsErrorHelpers,
    create: jest.fn(),
    bulkCreate: jest.fn(),
    checkConflicts: jest.fn(),
    bulkUpdate: jest.fn(),
    delete: jest.fn(),
    bulkGet: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    closePointInTime: jest.fn(),
    createPointInTimeFinder: jest.fn(),
    openPointInTimeForType: jest.fn().mockResolvedValue({ id: 'some_pit_id' }),
    resolve: jest.fn(),
    update: jest.fn(),
    addToNamespaces: jest.fn(),
    deleteFromNamespaces: jest.fn(),
    removeReferencesTo: jest.fn(),
  } as unknown) as jest.Mocked<SavedObjectsClientContract>;

  mock.createPointInTimeFinder = savedObjectsPointInTimeFinderMock.create({
    savedObjectsMock: mock,
  });

  return mock;
};

export const savedObjectsClientMock = { create };
