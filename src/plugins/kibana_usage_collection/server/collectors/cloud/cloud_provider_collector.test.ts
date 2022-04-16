/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloudDetailsMock, detectCloudServiceMock } from './cloud_provider_collector.test.mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  Collector,
  createUsageCollectionSetupMock,
  createCollectorFetchContextMock,
} from '@kbn/usage-collection-plugin/server/mocks';

import { registerCloudProviderUsageCollector } from './cloud_provider_collector';

describe('registerCloudProviderUsageCollector', () => {
  let collector: Collector<unknown>;
  const logger = loggingSystemMock.createLogger();
  const mockedFetchContext = createCollectorFetchContextMock();

  beforeEach(() => {
    cloudDetailsMock.mockClear();
    detectCloudServiceMock.mockClear();
    const usageCollectionMock = createUsageCollectionSetupMock();
    usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
      collector = new Collector(logger, config);
      return createUsageCollectionSetupMock().makeUsageCollector(config);
    });
    registerCloudProviderUsageCollector(usageCollectionMock);
  });

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
  });

  test('isReady() => false when cloud details are not available', () => {
    cloudDetailsMock.mockReturnValueOnce(undefined);
    expect(collector.isReady()).toBe(false);
  });

  test('isReady() => true when cloud details are available', () => {
    cloudDetailsMock.mockReturnValueOnce({ foo: true });
    expect(collector.isReady()).toBe(true);
  });

  test('isReady() => true when cloud details have been retrieved but none have been found', () => {
    cloudDetailsMock.mockReturnValueOnce(null);
    expect(collector.isReady()).toBe(true);
  });

  test('initiates CloudDetector.detectCloudDetails when called', () => {
    expect(detectCloudServiceMock).toHaveBeenCalledTimes(1);
  });

  describe('fetch()', () => {
    test('returns undefined when no details are available', async () => {
      cloudDetailsMock.mockReturnValueOnce(undefined);
      await expect(collector.fetch(mockedFetchContext)).resolves.toBeUndefined();
    });

    test('returns cloud details when defined', async () => {
      const mockDetails = {
        name: 'aws',
        vm_type: 't2.micro',
        region: 'us-west-2',
        zone: 'us-west-2a',
      };

      cloudDetailsMock.mockReturnValueOnce(mockDetails);
      await expect(collector.fetch(mockedFetchContext)).resolves.toEqual(mockDetails);
    });

    test('should not fail if invoked when not ready', async () => {
      cloudDetailsMock.mockReturnValueOnce(undefined);
      await expect(collector.fetch(mockedFetchContext)).resolves.toBe(undefined);
    });
  });
});
