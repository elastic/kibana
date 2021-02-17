/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsStart, SavedObjectSetup } from './plugin';

const createStartContract = (): SavedObjectsStart => {
  return {
    SavedObjectClass: jest.fn(),
    settings: {
      getPerPage: () => 20,
      getListingLimit: () => 100,
    },
  };
};

const createSetupContract = (): jest.Mocked<SavedObjectSetup> => {
  return {
    registerDecorator: jest.fn(),
  };
};

export const savedObjectsPluginMock = {
  createStartContract,
  createSetupContract,
};
