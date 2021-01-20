/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import {
  LoggingService,
  LoggingServiceSetup,
  InternalLoggingServiceSetup,
} from './logging_service';

const createInternalSetupMock = (): jest.Mocked<InternalLoggingServiceSetup> => ({
  configure: jest.fn(),
});

const createSetupMock = (): jest.Mocked<LoggingServiceSetup> => ({
  configure: jest.fn(),
});

type LoggingServiceContract = PublicMethodsOf<LoggingService>;
const createMock = (): jest.Mocked<LoggingServiceContract> => {
  const service: jest.Mocked<LoggingServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  service.setup.mockReturnValue(createInternalSetupMock());

  return service;
};

export const loggingServiceMock = {
  create: createMock,
  createSetupContract: createSetupMock,
  createInternalSetupContract: createInternalSetupMock,
};
