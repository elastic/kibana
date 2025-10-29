/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { IBrowserLoggingSystem } from '@kbn/core-logging-browser-internal';
import { lazyObject } from '@kbn/lazy-object';

const createLoggingSystemMock = () => {
  const mockLog: MockedLogger = loggerMock.create();

  mockLog.get.mockImplementation((...context) => ({
    ...mockLog,
    context,
  }));

  const mocked: jest.Mocked<IBrowserLoggingSystem> = lazyObject({
    get: jest.fn().mockImplementation((...context) => ({
      ...mockLog,
      context,
    })),
    asLoggerFactory: jest.fn(),
  });

  mocked.asLoggerFactory.mockImplementation(() => mocked);

  return mocked;
};

export const loggingSystemMock = {
  create: createLoggingSystemMock,
  createLogger: loggerMock.create,
};
