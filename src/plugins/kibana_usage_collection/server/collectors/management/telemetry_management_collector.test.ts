/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import {
  Collector,
  createUsageCollectionSetupMock,
  createCollectorFetchContextMock,
} from '@kbn/usage-collection-plugin/server/mocks';

import {
  registerManagementUsageCollector,
  createCollectorFetch,
} from './telemetry_management_collector';
import { IUiSettingsClient } from '@kbn/core/server';

const logger = loggingSystemMock.createLogger();

describe('telemetry_application_usage_collector', () => {
  let collector: Collector<unknown>;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = new Collector(logger, config);
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const uiSettingsClient = uiSettingsServiceMock.createClient();
  const getUiSettingsClient = jest.fn((): IUiSettingsClient | undefined => uiSettingsClient);
  const mockedFetchContext = createCollectorFetchContextMock();

  beforeAll(() => {
    registerManagementUsageCollector(usageCollectionMock, getUiSettingsClient);
  });

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
  });

  test('isReady() => false if no client', () => {
    getUiSettingsClient.mockImplementationOnce(() => undefined);
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
    getUiSettingsClient.mockImplementationOnce(() => undefined);
    await expect(collector.fetch(mockedFetchContext)).resolves.toBe(undefined);
  });
});

describe('createCollectorFetch', () => {
  const mockUserSettings = {
    item1: { userValue: 'test' },
    item2: { userValue: 123 },
    item3: { userValue: false },
  };

  const mockIsSensitive = (key: string) => {
    switch (key) {
      case 'item1':
      case 'item2':
        return false;
      case 'item3':
        return true;
      default:
        throw new Error(`Unexpected ui setting: ${key}`);
    }
  };

  it('returns #fetchUsageStats function', () => {
    const getUiSettingsClient = jest.fn(() => undefined);
    const fetchFunction = createCollectorFetch(getUiSettingsClient);
    expect(typeof fetchFunction).toBe('function');
  });

  describe('#fetchUsageStats', () => {
    it('returns undefined if no uiSettingsClient returned from getUiSettingsClient', async () => {
      const getUiSettingsClient = jest.fn(() => undefined);
      const fetchFunction = createCollectorFetch(getUiSettingsClient);
      const result = await fetchFunction();
      expect(result).toBe(undefined);
      expect(getUiSettingsClient).toBeCalledTimes(1);
    });

    it('returns all user changed settings', async () => {
      const uiSettingsClient = uiSettingsServiceMock.createClient();
      const getUiSettingsClient = jest.fn(() => uiSettingsClient);
      uiSettingsClient.getUserProvided.mockResolvedValue(mockUserSettings);
      uiSettingsClient.isSensitive.mockImplementation(mockIsSensitive);
      const fetchFunction = createCollectorFetch(getUiSettingsClient);
      const result = await fetchFunction();
      expect(typeof result).toBe('object');
      expect(Object.keys(result!)).toEqual(Object.keys(mockUserSettings));
    });

    it('returns the actual values of non-sensitive settings', async () => {
      const uiSettingsClient = uiSettingsServiceMock.createClient();
      const getUiSettingsClient = jest.fn(() => uiSettingsClient);
      uiSettingsClient.getUserProvided.mockResolvedValue(mockUserSettings);
      uiSettingsClient.isSensitive.mockImplementation(mockIsSensitive);
      const fetchFunction = createCollectorFetch(getUiSettingsClient);
      const result = await fetchFunction();
      expect(typeof result).toBe('object');
      expect(result!).toMatchObject({
        item1: 'test',
        item2: 123,
      });
    });

    it('returns [REDACTED] as a value for sensitive settings', async () => {
      const uiSettingsClient = uiSettingsServiceMock.createClient();
      const getUiSettingsClient = jest.fn(() => uiSettingsClient);
      uiSettingsClient.getUserProvided.mockResolvedValue(mockUserSettings);
      uiSettingsClient.isSensitive.mockImplementation(mockIsSensitive);
      const fetchFunction = createCollectorFetch(getUiSettingsClient);
      const result = await fetchFunction();
      expect(typeof result).toBe('object');
      expect(result!).toMatchObject({
        item3: '[REDACTED]',
      });
    });
  });
});
