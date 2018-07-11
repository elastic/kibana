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

import { getEnvOptions } from '../../config/__tests__/__mocks__/env';

const loggerConfig = {};

const configService = {
  atPath: jest.fn(() => loggerConfig),
};

const mockConfigService = jest.fn(() => configService);

const server = {
  start: jest.fn(),
  stop: jest.fn(),
};
const mockServer = jest.fn(() => server);

const loggingService = {
  stop: jest.fn(),
  upgrade: jest.fn(),
};

const logger = {
  get: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
  })),
};

const mockMutableLoggerFactory = jest.fn(() => logger);

const mockLoggingService = jest.fn(() => loggingService);

import { BehaviorSubject } from '../../../lib/kbn_observable';

jest.mock('../../config', () => ({ ConfigService: mockConfigService }));
jest.mock('../../', () => ({ Server: mockServer }));
jest.mock('../../logging/logging_service', () => ({
  LoggingService: mockLoggingService,
}));
jest.mock('../../logging/logger_factory', () => ({
  MutableLoggerFactory: mockMutableLoggerFactory,
}));

import { Root } from '../';
import { Env } from '../../config/env';
import { RawConfig } from '../../config/raw_config';

const env = new Env('.', getEnvOptions());
const config$ = new BehaviorSubject({} as RawConfig);

const mockProcessExit = jest.spyOn(global.process, 'exit').mockImplementation(() => {
  // noop
});
afterEach(() => {
  mockProcessExit.mockReset();
});

test('starts services on "start"', async () => {
  const root = new Root(config$, env);

  expect(loggingService.upgrade).toHaveBeenCalledTimes(0);
  expect(server.start).toHaveBeenCalledTimes(0);

  await root.start();

  expect(loggingService.upgrade).toHaveBeenCalledTimes(1);
  expect(loggingService.upgrade).toHaveBeenLastCalledWith(loggerConfig);
  expect(server.start).toHaveBeenCalledTimes(1);
});

test('stops services on "shutdown"', async () => {
  const root = new Root(config$, env);

  await root.start();

  expect(loggingService.stop).toHaveBeenCalledTimes(0);
  expect(server.stop).toHaveBeenCalledTimes(0);

  await root.shutdown();

  expect(loggingService.stop).toHaveBeenCalledTimes(1);
  expect(server.stop).toHaveBeenCalledTimes(1);
});

test('calls onShutdown param on "shutdown"', async () => {
  const onShutdown = jest.fn();

  const root = new Root(config$, env, onShutdown);

  await root.start();

  expect(onShutdown).toHaveBeenCalledTimes(0);

  const err = new Error('shutdown');

  await root.shutdown(err);

  expect(onShutdown).toHaveBeenCalledTimes(1);
  expect(onShutdown).toHaveBeenLastCalledWith(err);
});

describe('when configuring logger fails', () => {
  const logged = jest.spyOn(console, 'error');

  beforeEach(() => {
    logged.mockImplementation(() => {
      // noop
    });
  });

  afterEach(() => {
    logged.mockRestore();
  });

  test('calls shutdown', async () => {
    const onShutdown = jest.fn();

    const root = new Root(config$, env, onShutdown);
    const err = new Error('foo bar baz');

    configService.atPath.mockImplementationOnce(() => {
      throw err;
    });

    mockServer.mockClear();

    await expect(root.start()).rejects.toMatchSnapshot();

    expect(mockServer).not.toHaveBeenCalled();

    expect(onShutdown).toHaveBeenCalledTimes(1);
    expect(onShutdown).toHaveBeenLastCalledWith(err);

    expect(logged.mock.calls).toMatchSnapshot();
  });
});
