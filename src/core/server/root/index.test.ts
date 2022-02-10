/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rawConfigService, configService, logger, mockServer } from './index.test.mocks';

import { BehaviorSubject } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { REPO_ROOT } from '@kbn/utils';
import { getEnvOptions } from '../config/mocks';
import { Root } from '.';
import { Env } from '../config';

const env = Env.createDefault(REPO_ROOT, getEnvOptions());

let mockConsoleError: jest.SpyInstance;

beforeEach(() => {
  jest.spyOn(global.process, 'exit').mockReturnValue(undefined as never);
  mockConsoleError = jest.spyOn(console, 'error').mockReturnValue(undefined);
  logger.upgrade.mockResolvedValue(undefined);
  rawConfigService.getConfig$.mockReturnValue(new BehaviorSubject({ someValue: 'foo' }));
  configService.atPath.mockReturnValue(new BehaviorSubject({ someValue: 'foo' }));
});

afterEach(() => {
  jest.restoreAllMocks();
  logger.asLoggerFactory.mockClear();
  logger.stop.mockClear();
  rawConfigService.getConfig$.mockClear();

  logger.upgrade.mockReset();
  configService.atPath.mockReset();
  mockServer.preboot.mockReset();
  mockServer.setup.mockReset();
  mockServer.stop.mockReset();
});

test('preboot services on "preboot"', async () => {
  const root = new Root(rawConfigService, env);

  expect(logger.upgrade).not.toHaveBeenCalled();
  expect(mockServer.preboot).not.toHaveBeenCalled();

  await root.preboot();

  expect(logger.upgrade).toHaveBeenCalledTimes(1);
  expect(logger.upgrade).toHaveBeenLastCalledWith({ someValue: 'foo' });
  expect(mockServer.preboot).toHaveBeenCalledTimes(1);
});

test('sets up services on "setup"', async () => {
  const root = new Root(rawConfigService, env);

  expect(mockServer.setup).not.toHaveBeenCalled();

  await root.preboot();
  await root.setup();

  expect(mockServer.setup).toHaveBeenCalledTimes(1);
});

test('upgrades logging configuration after preboot', async () => {
  const mockLoggingConfig$ = new BehaviorSubject({ someValue: 'foo' });
  configService.atPath.mockReturnValue(mockLoggingConfig$);

  const root = new Root(rawConfigService, env);
  await root.preboot();

  expect(logger.upgrade).toHaveBeenCalledTimes(1);
  expect(logger.upgrade).toHaveBeenLastCalledWith({ someValue: 'foo' });
  logger.upgrade.mockClear();

  mockLoggingConfig$.next({ someValue: 'bar' });

  expect(logger.upgrade).toHaveBeenCalledTimes(1);
  expect(logger.upgrade).toHaveBeenLastCalledWith({ someValue: 'bar' });
});

test('upgrades logging configuration after setup', async () => {
  const mockLoggingConfig$ = new BehaviorSubject({ someValue: 'foo' });
  configService.atPath.mockReturnValue(mockLoggingConfig$);

  const root = new Root(rawConfigService, env);
  await root.preboot();
  await root.setup();

  expect(logger.upgrade).toHaveBeenCalledTimes(1);
  expect(logger.upgrade).toHaveBeenLastCalledWith({ someValue: 'foo' });
  logger.upgrade.mockClear();

  mockLoggingConfig$.next({ someValue: 'bar' });

  expect(logger.upgrade).toHaveBeenCalledTimes(1);
  expect(logger.upgrade).toHaveBeenLastCalledWith({ someValue: 'bar' });
});

test('stops services on "shutdown"', async () => {
  const mockOnShutdown = jest.fn();
  const root = new Root(rawConfigService, env, mockOnShutdown);

  await root.preboot();
  await root.setup();

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(logger.stop).not.toHaveBeenCalled();
  expect(mockServer.stop).not.toHaveBeenCalled();

  await root.shutdown();

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(undefined);
  expect(logger.stop).toHaveBeenCalledTimes(1);
  expect(mockServer.stop).toHaveBeenCalledTimes(1);
});

test('stops services on "shutdown" an calls `onShutdown` with error passed to `shutdown`', async () => {
  const mockOnShutdown = jest.fn();
  const root = new Root(rawConfigService, env, mockOnShutdown);

  await root.preboot();
  await root.setup();

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(logger.stop).not.toHaveBeenCalled();
  expect(mockServer.stop).not.toHaveBeenCalled();

  const someFatalError = new Error('some fatal error');
  await root.shutdown(someFatalError);

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(someFatalError);
  expect(logger.stop).toHaveBeenCalledTimes(1);
  expect(mockServer.stop).toHaveBeenCalledTimes(1);
});

test('fails and stops services if server preboot fails', async () => {
  const mockOnShutdown = jest.fn();
  const root = new Root(rawConfigService, env, mockOnShutdown);

  const serverError = new Error('server failed');
  mockServer.preboot.mockRejectedValue(serverError);

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(logger.stop).not.toHaveBeenCalled();
  expect(mockServer.stop).not.toHaveBeenCalled();

  await expect(root.preboot()).rejects.toThrowError('server failed');

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(serverError);
  expect(logger.stop).toHaveBeenCalledTimes(1);
  expect(mockServer.stop).toHaveBeenCalledTimes(1);
});

test('fails and stops services if server setup fails', async () => {
  const mockOnShutdown = jest.fn();
  const root = new Root(rawConfigService, env, mockOnShutdown);

  const serverError = new Error('server failed');
  mockServer.setup.mockRejectedValue(serverError);

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(logger.stop).not.toHaveBeenCalled();
  expect(mockServer.stop).not.toHaveBeenCalled();

  await root.preboot();
  await expect(root.setup()).rejects.toThrowError('server failed');

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(serverError);
  expect(logger.stop).toHaveBeenCalledTimes(1);
  expect(mockServer.stop).toHaveBeenCalledTimes(1);
});

test('fails and stops services if initial logger upgrade fails', async () => {
  const mockOnShutdown = jest.fn();
  const root = new Root(rawConfigService, env, mockOnShutdown);

  const loggingUpgradeError = new Error('logging config upgrade failed');
  logger.upgrade.mockImplementation(() => {
    throw loggingUpgradeError;
  });

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(logger.stop).not.toHaveBeenCalled();
  expect(mockServer.preboot).not.toHaveBeenCalled();

  await expect(root.preboot()).rejects.toThrowError('logging config upgrade failed');

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(loggingUpgradeError);
  expect(mockServer.preboot).not.toHaveBeenCalled();
  expect(logger.stop).toHaveBeenCalledTimes(1);

  expect(mockConsoleError.mock.calls).toMatchSnapshot();
});

test('stops services if consequent logger upgrade fails', async () => {
  const onShutdown = new BehaviorSubject<string | null>(null);
  const mockOnShutdown = jest.fn(() => {
    onShutdown.next('completed');
    onShutdown.complete();
  });

  const mockLoggingConfig$ = new BehaviorSubject({ someValue: 'foo' });
  configService.atPath.mockReturnValue(mockLoggingConfig$);

  const root = new Root(rawConfigService, env, mockOnShutdown);
  await root.preboot();
  await root.setup();

  expect(mockOnShutdown).not.toHaveBeenCalled();
  expect(logger.stop).not.toHaveBeenCalled();
  expect(mockServer.stop).not.toHaveBeenCalled();

  const loggingUpgradeError = new Error('logging config consequent upgrade failed');
  logger.upgrade.mockImplementation(() => {
    throw loggingUpgradeError;
  });
  mockLoggingConfig$.next({ someValue: 'bar' });

  // Wait for shutdown to be called.
  await onShutdown
    .pipe(
      filter((e) => e !== null),
      first()
    )
    .toPromise();

  expect(mockOnShutdown).toHaveBeenCalledTimes(1);
  expect(mockOnShutdown).toHaveBeenCalledWith(loggingUpgradeError);
  expect(logger.stop).toHaveBeenCalledTimes(1);
  expect(mockServer.stop).toHaveBeenCalledTimes(1);

  expect(mockConsoleError.mock.calls).toMatchSnapshot();
});
