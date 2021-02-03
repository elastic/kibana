/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  SavedObjectsManagementActionService,
  SavedObjectsManagementActionServiceSetup,
  SavedObjectsManagementActionServiceStart,
} from './action_service';

const createSetupMock = (): jest.Mocked<SavedObjectsManagementActionServiceSetup> => {
  const mock = {
    register: jest.fn(),
  };
  return mock;
};

const createStartMock = (): jest.Mocked<SavedObjectsManagementActionServiceStart> => {
  const mock = {
    has: jest.fn(),
    getAll: jest.fn(),
  };

  mock.has.mockReturnValue(true);
  mock.getAll.mockReturnValue([]);

  return mock;
};

const createServiceMock = (): jest.Mocked<PublicMethodsOf<SavedObjectsManagementActionService>> => {
  const mock = {
    setup: jest.fn().mockReturnValue(createSetupMock()),
    start: jest.fn().mockReturnValue(createStartMock()),
  };
  return mock;
};

export const actionServiceMock = {
  create: createServiceMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
};
