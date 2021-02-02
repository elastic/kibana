/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsService, SavedObjectsStart } from './saved_objects_service';

const createStartContractMock = () => {
  const mock: jest.Mocked<SavedObjectsStart> = {
    client: {
      create: jest.fn(),
      bulkCreate: jest.fn(),
      bulkUpdate: jest.fn(),
      delete: jest.fn(),
      bulkGet: jest.fn(),
      find: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    },
  };
  return mock;
};

const createMock = () => {
  const mocked: jest.Mocked<SavedObjectsService> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.start.mockReturnValue(Promise.resolve(createStartContractMock()));
  return mocked;
};

export const savedObjectsServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
