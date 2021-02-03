/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart } from './types';

const createSetupMock = (): jest.Mocked<SavedObjectTaggingOssPluginSetup> => {
  const mock = {
    registerTaggingApi: jest.fn(),
  };

  return mock;
};

const createStartMock = (): jest.Mocked<SavedObjectTaggingOssPluginStart> => {
  const mock = {
    isTaggingAvailable: jest.fn(),
    getTaggingApi: jest.fn(),
  };

  mock.isTaggingAvailable.mockReturnValue(false);

  return mock;
};

export { taggingApiMock } from './api.mock';

export const savedObjectTaggingOssPluginMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
