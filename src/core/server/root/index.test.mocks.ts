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

import { loggingSystemMock } from '../logging/logging_system.mock';
export const logger = loggingSystemMock.create();
jest.doMock('../logging/logging_system', () => ({
  LoggingSystem: jest.fn(() => logger),
}));

const realKbnConfig = jest.requireActual('@kbn/config');

import { configServiceMock, rawConfigServiceMock } from '../config/mocks';
export const configService = configServiceMock.create();
export const rawConfigService = rawConfigServiceMock.create();
jest.doMock('@kbn/config', () => ({
  ...realKbnConfig,
  ConfigService: jest.fn(() => configService),
  RawConfigService: jest.fn(() => rawConfigService),
}));

export const mockServer = {
  setupCoreConfig: jest.fn(),
  setup: jest.fn(),
  stop: jest.fn(),
  configService,
};
jest.mock('../server', () => ({ Server: jest.fn(() => mockServer) }));
