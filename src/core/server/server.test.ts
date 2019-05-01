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

import {
  elasticsearchService,
  httpService,
  mockLegacyService,
  mockPluginsService,
} from './index.test.mocks';

import { BehaviorSubject } from 'rxjs';
import { Env } from './config';
import { Server } from './server';

import { getEnvOptions } from './config/__mocks__/env';
import { configServiceMock } from './config/config_service.mock';
import { loggingServiceMock } from './logging/logging_service.mock';

const configService = configServiceMock.create();
const env = new Env('.', getEnvOptions());
const logger = loggingServiceMock.create();

beforeEach(() => {
  configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
});

afterEach(() => {
  jest.clearAllMocks();

  configService.atPath.mockReset();
  httpService.setup.mockClear();
  httpService.start.mockClear();
  httpService.stop.mockReset();
  elasticsearchService.setup.mockReset();
  elasticsearchService.stop.mockReset();
  mockPluginsService.setup.mockReset();
  mockPluginsService.stop.mockReset();
  mockLegacyService.setup.mockReset();
  mockLegacyService.start.mockReset();
  mockLegacyService.stop.mockReset();
});

test('sets up services on "setup"', async () => {
  const mockPluginsServiceSetup = new Map([['some-plugin', 'some-value']]);
  mockPluginsService.setup.mockReturnValue(Promise.resolve(mockPluginsServiceSetup));

  const server = new Server(configService as any, logger, env);

  expect(httpService.setup).not.toHaveBeenCalled();
  expect(elasticsearchService.setup).not.toHaveBeenCalled();
  expect(mockPluginsService.setup).not.toHaveBeenCalled();
  expect(mockLegacyService.start).not.toHaveBeenCalled();

  await server.setup();

  expect(httpService.setup).toHaveBeenCalledTimes(1);
  expect(elasticsearchService.setup).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.setup).toHaveBeenCalledTimes(1);
});

test('runs services on "start"', async () => {
  const mockPluginsServiceSetup = new Map([['some-plugin', 'some-value']]);
  mockPluginsService.setup.mockReturnValue(Promise.resolve(mockPluginsServiceSetup));

  const server = new Server(configService as any, logger, env);

  expect(httpService.setup).not.toHaveBeenCalled();
  expect(mockLegacyService.start).not.toHaveBeenCalled();

  await server.setup();
  await server.start();

  expect(httpService.start).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.start).toHaveBeenCalledTimes(1);
});

test('does not fail on "setup" if there are unused paths detected', async () => {
  configService.getUnusedPaths.mockResolvedValue(['some.path', 'another.path']);

  const server = new Server(configService as any, logger, env);
  await expect(server.setup()).resolves.toBeDefined();
  expect(loggingServiceMock.collect(logger)).toMatchSnapshot('unused paths logs');
});

test('stops services on "stop"', async () => {
  const server = new Server(configService as any, logger, env);

  await server.setup();

  expect(httpService.stop).not.toHaveBeenCalled();
  expect(elasticsearchService.stop).not.toHaveBeenCalled();
  expect(mockPluginsService.stop).not.toHaveBeenCalled();
  expect(mockLegacyService.stop).not.toHaveBeenCalled();

  await server.stop();

  expect(httpService.stop).toHaveBeenCalledTimes(1);
  expect(elasticsearchService.stop).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.stop).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.stop).toHaveBeenCalledTimes(1);
});
