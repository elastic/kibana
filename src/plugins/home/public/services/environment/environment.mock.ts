/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { EnvironmentService, EnvironmentServiceSetup } from './environment';

const createSetupMock = (): jest.Mocked<EnvironmentServiceSetup> => {
  const setup = {
    update: jest.fn(),
  };
  return setup;
};

const createMock = (): jest.Mocked<PublicMethodsOf<EnvironmentService>> => {
  const service = {
    setup: jest.fn(createSetupMock),
    getEnvironment: jest.fn(() => ({
      cloud: false,
      apmUi: false,
      ml: false,
    })),
  };
  return service;
};

export const environmentServiceMock = {
  createSetup: createSetupMock,
  create: createMock,
};
