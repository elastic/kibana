/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { LoggingServiceSetup } from '@kbn/core-logging-server';
import type {
  LoggingService,
  InternalLoggingServiceSetup,
  InternalLoggingServicePreboot,
} from '@kbn/core-logging-server-internal';

const createInternalPrebootMock = (): jest.Mocked<InternalLoggingServicePreboot> => ({
  configure: jest.fn(),
});

const createInternalSetupMock = (): jest.Mocked<InternalLoggingServiceSetup> => ({
  configure: jest.fn(),
});

const createSetupMock = (): jest.Mocked<LoggingServiceSetup> => ({
  configure: jest.fn(),
});

type LoggingServiceContract = PublicMethodsOf<LoggingService>;
const createMock = (): jest.Mocked<LoggingServiceContract> => {
  const service: jest.Mocked<LoggingServiceContract> = {
    preboot: jest.fn(),
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  service.preboot.mockReturnValue(createInternalPrebootMock());
  service.setup.mockReturnValue(createInternalSetupMock());

  return service;
};

export const loggingServiceMock = {
  create: createMock,
  createSetupContract: createSetupMock,
  createInternalPrebootContract: createInternalPrebootMock,
  createInternalSetupContract: createInternalSetupMock,
};
