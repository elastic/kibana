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

const mockHttpService = { start: jest.fn(), stop: jest.fn(), registerRouter: jest.fn() };
jest.mock('./http/http_service', () => ({
  HttpService: jest.fn(() => mockHttpService),
}));

const mockPluginsService = { start: jest.fn(), stop: jest.fn() };
jest.mock('./plugins/plugins_service', () => ({
  PluginsService: jest.fn(() => mockPluginsService),
}));

const mockLegacyService = { start: jest.fn(), stop: jest.fn() };
jest.mock('./legacy_compat/legacy_service', () => ({
  LegacyService: jest.fn(() => mockLegacyService),
}));

import { BehaviorSubject } from 'rxjs';
import { Server } from '.';
import { Env } from './config';
import { getEnvOptions } from './config/__mocks__/env';
import { logger } from './logging/__mocks__';

const mockConfigService = { atPath: jest.fn(), getUnusedPaths: jest.fn().mockReturnValue([]) };
const env = new Env('.', getEnvOptions());

beforeEach(() => {
  mockConfigService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
});

afterEach(() => {
  logger.mockClear();
  mockConfigService.atPath.mockReset();
  mockHttpService.start.mockReset();
  mockHttpService.stop.mockReset();
  mockPluginsService.start.mockReset();
  mockPluginsService.stop.mockReset();
  mockLegacyService.start.mockReset();
  mockLegacyService.stop.mockReset();
});

test('starts services on "start"', async () => {
  const mockHttpServiceStartContract = { something: true };
  mockHttpService.start.mockReturnValue(Promise.resolve(mockHttpServiceStartContract));

  const mockPluginsServiceStartContract = new Map([['some-plugin', 'some-value']]);
  mockPluginsService.start.mockReturnValue(Promise.resolve(mockPluginsServiceStartContract));

  const server = new Server(mockConfigService as any, logger, env);

  expect(mockHttpService.start).not.toHaveBeenCalled();
  expect(mockPluginsService.start).not.toHaveBeenCalled();
  expect(mockLegacyService.start).not.toHaveBeenCalled();

  await server.start();

  expect(mockHttpService.start).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.start).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.start).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.start).toHaveBeenCalledWith({
    http: mockHttpServiceStartContract,
    plugins: mockPluginsServiceStartContract,
  });
});

test('does not fail on "start" if there are unused paths detected', async () => {
  mockConfigService.getUnusedPaths.mockReturnValue(['some.path', 'another.path']);

  const server = new Server(mockConfigService as any, logger, env);
  await expect(server.start()).resolves.toBeUndefined();
  expect(logger.mockCollect()).toMatchSnapshot('unused paths logs');
});

test('does not start http service is `autoListen:false`', async () => {
  mockConfigService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: false }));

  const server = new Server(mockConfigService as any, logger, env);

  expect(mockLegacyService.start).not.toHaveBeenCalled();

  await server.start();

  expect(mockHttpService.start).not.toHaveBeenCalled();
  expect(mockLegacyService.start).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.start).toHaveBeenCalledWith({});
});

test('does not start http service if process is dev cluster master', async () => {
  const server = new Server(
    mockConfigService as any,
    logger,
    new Env('.', getEnvOptions({ isDevClusterMaster: true }))
  );

  expect(mockLegacyService.start).not.toHaveBeenCalled();

  await server.start();

  expect(mockHttpService.start).not.toHaveBeenCalled();
  expect(mockLegacyService.start).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.start).toHaveBeenCalledWith({});
});

test('stops services on "stop"', async () => {
  const mockHttpServiceStartContract = { something: true };
  mockHttpService.start.mockReturnValue(Promise.resolve(mockHttpServiceStartContract));

  const server = new Server(mockConfigService as any, logger, env);

  await server.start();

  expect(mockHttpService.stop).not.toHaveBeenCalled();
  expect(mockPluginsService.stop).not.toHaveBeenCalled();
  expect(mockLegacyService.stop).not.toHaveBeenCalled();

  await server.stop();

  expect(mockHttpService.stop).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.stop).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.stop).toHaveBeenCalledTimes(1);
});
