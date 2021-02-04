/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Test helpers to simplify mocking logs and collecting all their outputs
import { LoggerFactory } from '@kbn/logging';
import { ILoggingSystem } from './logging_system';
import { loggerMock, MockedLogger } from './logger.mock';

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
  const mockedLoggerFactory = (loggerFactory as unknown) as jest.Mocked<ILoggingSystem>;
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
