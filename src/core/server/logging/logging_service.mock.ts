/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Test helpers to simplify mocking logs and collecting all their outputs
import { Logger } from './logger';
import { ILoggingService } from './logging_service';
import { LoggerFactory } from './logger_factory';

type MockedLogger = jest.Mocked<Logger>;

const createLoggingServiceMock = () => {
  const mockLog: MockedLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
  };

  const mocked: jest.Mocked<ILoggingService> = {
    get: jest.fn(),
    asLoggerFactory: jest.fn(),
    upgrade: jest.fn(),
    stop: jest.fn(),
  };
  mocked.get.mockImplementation((...context) => ({
    context,
    ...mockLog,
  }));
  mocked.asLoggerFactory.mockImplementation(() => mocked);
  mocked.stop.mockResolvedValue();
  return mocked;
};

const collectLoggingServiceMock = (loggerFactory: LoggerFactory) => {
  const mockLog = loggerFactory.get() as MockedLogger;
  return {
    debug: mockLog.debug.mock.calls,
    error: mockLog.error.mock.calls,
    fatal: mockLog.fatal.mock.calls,
    info: mockLog.info.mock.calls,
    log: mockLog.log.mock.calls,
    trace: mockLog.trace.mock.calls,
    warn: mockLog.warn.mock.calls,
  };
};

const clearLoggingServiceMock = (loggerFactory: LoggerFactory) => {
  const mockedLoggerFactory = (loggerFactory as unknown) as jest.Mocked<ILoggingService>;
  mockedLoggerFactory.get.mockClear();
  mockedLoggerFactory.asLoggerFactory.mockClear();
  mockedLoggerFactory.upgrade.mockClear();
  mockedLoggerFactory.stop.mockClear();

  const mockLog = loggerFactory.get() as MockedLogger;
  mockLog.debug.mockClear();
  mockLog.info.mockClear();
  mockLog.warn.mockClear();
  mockLog.error.mockClear();
  mockLog.trace.mockClear();
  mockLog.fatal.mockClear();
  mockLog.log.mockClear();
};

export const loggingServiceMock = {
  create: createLoggingServiceMock,
  collect: collectLoggingServiceMock,
  clear: clearLoggingServiceMock,
};
