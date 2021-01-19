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

import { loggingSystemMock, uiSettingsServiceMock } from '../../../../../core/server/mocks';
import {
  Collector,
  createUsageCollectionSetupMock,
  createCollectorFetchContextMock,
} from '../../../../usage_collection/server/usage_collection.mock';

import {
  registerManagementUsageCollector,
  createCollectorFetch,
} from './telemetry_management_collector';

const logger = loggingSystemMock.createLogger();

describe('telemetry_application_usage_collector', () => {
  let collector: Collector<unknown>;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = new Collector(logger, config);
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const uiSettingsClient = uiSettingsServiceMock.createClient();
  const getUiSettingsClient = jest.fn(() => uiSettingsClient);
  const mockedFetchContext = createCollectorFetchContextMock();

  beforeAll(() => {
    registerManagementUsageCollector(usageCollectionMock, getUiSettingsClient);
  });

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
  });

  test('isReady() => false if no client', () => {
    getUiSettingsClient.mockImplementationOnce(() => undefined as any);
    expect(collector.isReady()).toBe(false);
  });

  test('isReady() => true', () => {
    expect(collector.isReady()).toBe(true);
  });

  test('fetch()', async () => {
    uiSettingsClient.getUserProvided.mockImplementationOnce(async () => ({
      'visualization:colorMapping': { userValue: 'red' },
    }));
    await expect(collector.fetch(mockedFetchContext)).resolves.toEqual({
      'visualization:colorMapping': 'red',
    });
  });

  test('fetch() should not fail if invoked when not ready', async () => {
    getUiSettingsClient.mockImplementationOnce(() => undefined as any);
    await expect(collector.fetch(mockedFetchContext)).resolves.toBe(undefined);
  });
});

describe('createCollectorFetch', () => {
  const mockUserSettings = {
    item1: { userValue: 'test' },
    item2: { userValue: 123 },
    item3: { userValue: false },
  };
  const mockWhitelist = ['item1', 'item2'] as any[];

  it('returns #fetchUsageStats function', () => {
    const getUiSettingsClient = jest.fn(() => undefined);
    const fetchFunction = createCollectorFetch(getUiSettingsClient, mockWhitelist);
    expect(typeof fetchFunction).toBe('function');
  });

  describe('#fetchUsageStats', () => {
    it('returns undefined if no uiSettingsClient returned from getUiSettingsClient', async () => {
      const getUiSettingsClient = jest.fn(() => undefined);
      const fetchFunction = createCollectorFetch(getUiSettingsClient, mockWhitelist);
      const result = await fetchFunction();
      expect(result).toBe(undefined);
      expect(getUiSettingsClient).toBeCalledTimes(1);
    });

    it('returns all user changed settings', async () => {
      const uiSettingsClient = uiSettingsServiceMock.createClient();
      const getUiSettingsClient = jest.fn(() => uiSettingsClient);
      uiSettingsClient.getUserProvided.mockResolvedValue(mockUserSettings);
      const fetchFunction = createCollectorFetch(getUiSettingsClient, mockWhitelist);
      const result = await fetchFunction();
      expect(typeof result).toBe('object');
      expect(Object.keys(result!)).toEqual(Object.keys(mockUserSettings));
    });

    it('returns values of whitelisted items', async () => {
      const uiSettingsClient = uiSettingsServiceMock.createClient();
      const getUiSettingsClient = jest.fn(() => uiSettingsClient);
      uiSettingsClient.getUserProvided.mockResolvedValue(mockUserSettings);
      const fetchFunction = createCollectorFetch(getUiSettingsClient, mockWhitelist);
      const result = await fetchFunction();
      expect(typeof result).toBe('object');
      expect(result!).toMatchObject({
        item1: 'test',
        item2: 123,
      });
    });

    it('returns true as value of blacklisted items', async () => {
      const uiSettingsClient = uiSettingsServiceMock.createClient();
      const getUiSettingsClient = jest.fn(() => uiSettingsClient);
      uiSettingsClient.getUserProvided.mockResolvedValue(mockUserSettings);
      const fetchFunction = createCollectorFetch(getUiSettingsClient, mockWhitelist);
      const result = await fetchFunction();
      expect(typeof result).toBe('object');
      expect(result!).toMatchObject({
        item3: true,
      });
    });
  });
});
