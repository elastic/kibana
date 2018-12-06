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

const mockLoggingService = { asLoggerFactory: jest.fn(), upgrade: jest.fn(), stop: jest.fn() };
jest.mock('../logging', () => ({
  LoggingService: jest.fn(() => mockLoggingService),
}));

const mockConfigService = { atPath: jest.fn(), getConfig$: jest.fn() };
jest.mock('../config/config_service', () => ({
  ConfigService: jest.fn(() => mockConfigService),
}));

const mockServer = { start: jest.fn(), stop: jest.fn() };
jest.mock('../', () => ({ Server: jest.fn(() => mockServer) }));

import { BehaviorSubject } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { Root } from '.';
import { Config, Env } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { logger } from '../logging/__mocks__';

const env = new Env('.', getEnvOptions());
const config$ = new BehaviorSubject({} as Config);

const mockProcessExit = jest.spyOn(global.process, 'exit').mockImplementation(() => {
  // noop
});

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {
  // noop
});

beforeEach(() => {
  mockLoggingService.asLoggerFactory.mockReturnValue(logger);
  mockConfigService.getConfig$.mockReturnValue(new BehaviorSubject({}));
  mockConfigService.atPath.mockReturnValue(new BehaviorSubject({ someValue: 'foo' }));
});

afterEach(() => {
  mockProcessExit.mockReset();
  mockConsoleError.mockReset();

  mockLoggingService.upgrade.mockReset();
  mockLoggingService.stop.mockReset();
  mockLoggingService.asLoggerFactory.mockReset();
  mockConfigService.atPath.mockReset();
  mockConfigService.getConfig$.mockReset();
  mockServer.start.mockReset();
  mockServer.stop.mockReset();
});

test('starts services on "start"', async () => {
  const root = new Root(config$, env);

  expect(mockLoggingService.upgrade).not.toHaveBeenCalled();
  expect(mockServer.start).not.toHaveBeenCalled();

  await root.start();

  expect(mockLoggingService.upgrade).toHaveBeenCalledTimes(1);
  expect(mockLoggingService.upgrade).toHaveBeenLastCalledWith({ someValue: 'foo' });
  expect(mockServer.start).toHaveBeenCalledTimes(1);
});

test('upgrades logging configuration after start', async () => {
  const mockLoggingConfig$ = new BehaviorSubject({ someValue: 'foo' });
  mockConfigService.atPath.mockReturnValue(mockLoggingConfig$);

  const root = new Root(config$, env);
  await root.start();

  expect(mockLoggingService.upgrade).toHaveBeenCalledTimes(1);
  expect(mockLoggingService.upgrade).toHaveBeenLastCalledWith({ someValue: 'foo' });
  mockLoggingService.upgrade.mockClear();

  mockLoggingConfig$.next({ someValue: 'bar' });

  expect(mockLoggingService.upgrade).toHaveBeenCalledTimes(1);
  expect(mockLoggingService.upgrade).toHaveBeenLastCalledWith({ someValue: 'bar' });
});

test('stops services on "shutdown"', async () => {
  const mockOnShutdown = jest.fn();
  const root = new Root(config$, env, mockOnShutdown);

  await root.start();

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(mockLoggingService.stop).not.toHaveBeenCalled();
  expect(mockServer.stop).not.toHaveBeenCalled();

  await root.shutdown();

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(undefined);
  expect(mockLoggingService.stop).toHaveBeenCalledTimes(1);
  expect(mockServer.stop).toHaveBeenCalledTimes(1);
});

test('stops services on "shutdown" an calls `onShutdown` with error passed to `shutdown`', async () => {
  const mockOnShutdown = jest.fn();
  const root = new Root(config$, env, mockOnShutdown);

  await root.start();

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(mockLoggingService.stop).not.toHaveBeenCalled();
  expect(mockServer.stop).not.toHaveBeenCalled();

  const someFatalError = new Error('some fatal error');
  await root.shutdown(someFatalError);

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(someFatalError);
  expect(mockLoggingService.stop).toHaveBeenCalledTimes(1);
  expect(mockServer.stop).toHaveBeenCalledTimes(1);
});

test('fails and stops services if server fails to start', async () => {
  const mockOnShutdown = jest.fn();
  const root = new Root(config$, env, mockOnShutdown);

  const serverError = new Error('server failed');
  mockServer.start.mockRejectedValue(serverError);

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(mockLoggingService.stop).not.toHaveBeenCalled();
  expect(mockServer.stop).not.toHaveBeenCalled();

  await expect(root.start()).rejects.toThrowError('server failed');

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(serverError);
  expect(mockLoggingService.stop).toHaveBeenCalledTimes(1);
  expect(mockServer.stop).toHaveBeenCalledTimes(1);
});

test('fails and stops services if initial logger upgrade fails', async () => {
  const mockOnShutdown = jest.fn();
  const root = new Root(config$, env, mockOnShutdown);

  const loggingUpgradeError = new Error('logging config upgrade failed');
  mockLoggingService.upgrade.mockImplementation(() => {
    throw loggingUpgradeError;
  });

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(mockLoggingService.stop).not.toHaveBeenCalled();
  expect(mockServer.start).not.toHaveBeenCalled();

  await expect(root.start()).rejects.toThrowError('logging config upgrade failed');

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(loggingUpgradeError);
  expect(mockServer.start).not.toHaveBeenCalled();
  expect(mockLoggingService.stop).toHaveBeenCalledTimes(1);

  expect(mockConsoleError.mock.calls).toMatchSnapshot();
});

test('stops services if consequent logger upgrade fails', async () => {
  const onShutdown = new BehaviorSubject<string | null>(null);
  const mockOnShutdown = jest.fn(() => {
    onShutdown.next('completed');
    onShutdown.complete();
  });

  const mockLoggingConfig$ = new BehaviorSubject({ someValue: 'foo' });
  mockConfigService.atPath.mockReturnValue(mockLoggingConfig$);

  const root = new Root(config$, env, mockOnShutdown);
  await root.start();

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(mockLoggingService.stop).not.toHaveBeenCalled();
  expect(mockServer.stop).not.toHaveBeenCalled();

  const loggingUpgradeError = new Error('logging config consequent upgrade failed');
  mockLoggingService.upgrade.mockImplementation(() => {
    throw loggingUpgradeError;
  });
  mockLoggingConfig$.next({ someValue: 'bar' });

  // Wait for shutdown to be called.
  await onShutdown
    .pipe(
      filter(e => e !== null),
      first()
    )
    .toPromise();

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(loggingUpgradeError);
  expect(mockLoggingService.stop).toHaveBeenCalledTimes(1);
  expect(mockServer.stop).toHaveBeenCalledTimes(1);

  expect(mockConsoleError.mock.calls).toMatchSnapshot();
});
