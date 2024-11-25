/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Test helpers to simplify mocking logs and collecting all their outputs
import type { LoggerFactory } from '@kbn/logging';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import type { ILoggingSystem } from '@kbn/core-logging-server-internal';

const createLoggingSystemMock = () => {
  const mockLog = loggerMock.create();

  mockLog.get.mockImplementation((...context) => ({
    ...mockLog,
    context,
  }));

  const mocked: jest.Mocked<ILoggingSystem> = {
    get: jest.fn(),
    asLoggerFactory: jest.fn(),
    setContextConfig: jest.fn(),
    setGlobalContext: jest.fn(),
    upgrade: jest.fn(),
    stop: jest.fn(),
  };
  mocked.get.mockImplementation((...context) => ({
    ...mockLog,
    context,
  }));
  mocked.asLoggerFactory.mockImplementation(() => mocked);
  mocked.upgrade.mockResolvedValue(undefined);
  mocked.stop.mockResolvedValue();
  return mocked;
};

const collectLoggingSystemMock = (loggerFactory: LoggerFactory) => {
  const mockLog = loggerFactory.get() as MockedLogger;
  return loggerMock.collect(mockLog);
};

const clearLoggingSystemMock = (loggerFactory: LoggerFactory) => {
  const mockedLoggerFactory = loggerFactory as unknown as jest.Mocked<ILoggingSystem>;
  mockedLoggerFactory.get.mockClear();
  mockedLoggerFactory.asLoggerFactory.mockClear();
  mockedLoggerFactory.upgrade.mockClear();
  mockedLoggerFactory.stop.mockClear();

  const mockLog = loggerFactory.get() as MockedLogger;
  loggerMock.clear(mockLog);
};

export const loggingSystemMock = {
  create: createLoggingSystemMock,
  collect: collectLoggingSystemMock,
  clear: clearLoggingSystemMock,
  createLogger: loggerMock.create,
};
