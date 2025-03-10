/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { AddDataService, AddDataServiceSetup } from './add_data_service';

const createSetupMock = (): jest.Mocked<AddDataServiceSetup> => {
  const setup = {
    registerAddDataTab: jest.fn(),
  };
  return setup;
};

const createMock = (): jest.Mocked<PublicMethodsOf<AddDataService>> => {
  const service = {
    setup: jest.fn(),
    getAddDataTabs: jest.fn(() => []),
  };
  service.setup.mockImplementation(createSetupMock);
  return service;
};

export const addDataServiceMock = {
  createSetup: createSetupMock,
  create: createMock,
};
