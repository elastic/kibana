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
import { httpServiceMock } from './http/http_service.mock';
const httpService = httpServiceMock.create();
jest.mock('./http/http_service', () => ({
  HttpService: jest.fn(() => httpService),
}));

const mockPluginsService = { start: jest.fn(), stop: jest.fn() };
jest.mock('./plugins/plugins_service', () => ({
  PluginsService: jest.fn(() => mockPluginsService),
}));

import { elasticsearchServiceMock } from './elasticsearch/elasticsearch_service.mock';
const elasticsearchService = elasticsearchServiceMock.create();
jest.mock('./elasticsearch/elasticsearch_service', () => ({
  ElasticsearchService: jest.fn(() => elasticsearchService),
}));

const mockLegacyService = { start: jest.fn(), stop: jest.fn() };
jest.mock('./legacy/legacy_service', () => ({
  LegacyService: jest.fn(() => mockLegacyService),
}));

import { BehaviorSubject } from 'rxjs';
import { Server } from '.';
import { Env } from './config';
import { getEnvOptions } from './config/__mocks__/env';
import { loggingServiceMock } from './logging/logging_service.mock';

import { configServiceMock } from './config/config_service.mock';

const configService = configServiceMock.create();
const env = new Env('.', getEnvOptions());
const logger = loggingServiceMock.create();

beforeEach(() => {
  configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
});

afterEach(() => {
  jest.clearAllMocks();

  configService.atPath.mockReset();
  httpService.start.mockReset();
  httpService.stop.mockReset();
  elasticsearchService.start.mockReset();
  elasticsearchService.stop.mockReset();
  mockPluginsService.start.mockReset();
  mockPluginsService.stop.mockReset();
  mockLegacyService.start.mockReset();
  mockLegacyService.stop.mockReset();
});

test('starts services on "start"', async () => {
  const mockPluginsServiceStart = new Map([['some-plugin', 'some-value']]);
  mockPluginsService.start.mockReturnValue(Promise.resolve(mockPluginsServiceStart));

  const server = new Server(configService as any, logger, env);

  expect(httpService.start).not.toHaveBeenCalled();
  expect(elasticsearchService.start).not.toHaveBeenCalled();
  expect(mockPluginsService.start).not.toHaveBeenCalled();
  expect(mockLegacyService.start).not.toHaveBeenCalled();

  await server.start();

  expect(httpService.start).toHaveBeenCalledTimes(1);
  expect(elasticsearchService.start).toHaveBeenCalledTimes(1);
  expect(mockPluginsService.start).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.start).toHaveBeenCalledTimes(1);
});

test('does not fail on "start" if there are unused paths detected', async () => {
  configService.getUnusedPaths.mockResolvedValue(['some.path', 'another.path']);

  const server = new Server(configService as any, logger, env);
  await expect(server.start()).resolves.toBeUndefined();
  expect(loggingServiceMock.collect(logger)).toMatchSnapshot('unused paths logs');
});

test('does not start http service is `autoListen:false`', async () => {
  configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: false }));

  const server = new Server(configService as any, logger, env);

  expect(mockLegacyService.start).not.toHaveBeenCalled();

  await server.start();

  expect(httpService.start).not.toHaveBeenCalled();
  expect(mockLegacyService.start).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.start).toHaveBeenCalledWith({});
});

test('does not start http service if process is dev cluster master', async () => {
  const server = new Server(
    configService as any,
    logger,
    new Env('.', getEnvOptions({ isDevClusterMaster: true }))
  );

  expect(mockLegacyService.start).not.toHaveBeenCalled();

  await server.start();

  expect(httpService.start).not.toHaveBeenCalled();
  expect(mockLegacyService.start).toHaveBeenCalledTimes(1);
  expect(mockLegacyService.start).toHaveBeenCalledWith({});
});

test('stops services on "stop"', async () => {
  const server = new Server(configService as any, logger, env);

  await server.start();

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
