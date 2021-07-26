/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AddTopNavDataService, AddTopNavDataServiceSetup } from './add_top_nav_data';
import type { PublicMethodsOf } from '@kbn/utility-types';

const createSetupMock = (): jest.Mocked<AddTopNavDataServiceSetup> => {
  const setup = {
    registerTopNavLinkGetter: jest.fn(),
  };
  return setup;
};

const createMock = (): jest.Mocked<PublicMethodsOf<AddTopNavDataService>> => {
  const service = {
    setup: jest.fn(),
    getTopNavLinkGetters: jest.fn(() => []),
  };
  service.setup.mockImplementation(createSetupMock);
  return service;
};

export const addTopNavDataServiceMock = {
  createSetup: createSetupMock,
  create: createMock,
};
