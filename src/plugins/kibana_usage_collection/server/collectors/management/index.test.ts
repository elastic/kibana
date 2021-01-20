/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { loggingSystemMock, uiSettingsServiceMock } from '../../../../../core/server/mocks';
import {
  Collector,
  createUsageCollectionSetupMock,
  createCollectorFetchContextMock,
} from '../../../../usage_collection/server/usage_collection.mock';

import { registerManagementUsageCollector } from './';

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
      'my-key': { userValue: 'my-value' },
    }));
    await expect(collector.fetch(mockedFetchContext)).resolves.toMatchSnapshot();
  });

  test('fetch() should not fail if invoked when not ready', async () => {
    getUiSettingsClient.mockImplementationOnce(() => undefined as any);
    await expect(collector.fetch(mockedFetchContext)).resolves.toBe(undefined);
  });
});
