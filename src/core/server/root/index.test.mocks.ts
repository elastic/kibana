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

import { loggingServiceMock } from '../logging/logging_service.mock';
export const logger = loggingServiceMock.create();
jest.doMock('../logging/logging_service', () => ({
  LoggingService: jest.fn(() => logger),
}));

import { configServiceMock } from '../config/config_service.mock';
export const configService = configServiceMock.create();
jest.doMock('src/core/server/config/config_service', () => ({
  ConfigService: jest.fn(() => configService),
}));

import { rawConfigServiceMock } from '../config/raw_config_service.mock';
export const rawConfigService = rawConfigServiceMock.create();
jest.doMock('../config/raw_config_service', () => ({
  RawConfigService: jest.fn(() => rawConfigService),
}));

export const mockServer = {
  setupCoreConfig: jest.fn(),
  setup: jest.fn(),
  stop: jest.fn(),
  configService,
};
jest.mock('../server', () => ({ Server: jest.fn(() => mockServer) }));
