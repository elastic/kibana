/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { spacesApiMock } from '../api.mock';
import { SpacesOssPluginSetup, SpacesOssPluginStart } from '..';

const createSetupContract = (): jest.Mocked<SpacesOssPluginSetup> => ({
  registerSpacesApi: jest.fn(),
});

const createStartContract = (): jest.Mocked<SpacesOssPluginStart> => ({
  isSpacesAvailable: true,
  ...spacesApiMock.create(),
});

export const spacesOssPluginMock = {
  createSetupContract,
  createStartContract,
};
