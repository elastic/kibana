/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import {
  Collector,
  createUsageCollectionSetupMock,
  createCollectorFetchContextMock,
} from '@kbn/usage-collection-plugin/server/mocks';

import { registerUiMetricUsageCollector } from '.';

const logger = loggingSystemMock.createLogger();

describe('telemetry_ui_metric', () => {
  let collector: Collector<unknown>;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = new Collector(logger, config);
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const getUsageCollector = jest.fn();
  const registerType = jest.fn();
  const mockedFetchContext = createCollectorFetchContextMock();

  const commonSavedObjectsAttributes = { score: 0, references: [], type: 'ui-metric' };

  beforeAll(() =>
    registerUiMetricUsageCollector(usageCollectionMock, registerType, getUsageCollector)
  );

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
  });

  test('if no savedObjectClient initialised, return undefined', async () => {
    expect(await collector.fetch(mockedFetchContext)).toBeUndefined();
  });

  test('when savedObjectClient is initialised, return something', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    savedObjectClient.find.mockImplementation(async () => ({
      saved_objects: [],
      total: 0,
      per_page: 10,
      page: 1,
    }));
    getUsageCollector.mockImplementation(() => savedObjectClient);

    expect(await collector.fetch(mockedFetchContext)).toStrictEqual({});
    expect(savedObjectClient.bulkCreate).not.toHaveBeenCalled();
  });

  test('results grouped by appName', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    savedObjectClient.find.mockResolvedValue({
      saved_objects: [
        {
          ...commonSavedObjectsAttributes,
          id: 'testAppName:testKeyName1',
          attributes: { count: 3 },
        },
        {
          ...commonSavedObjectsAttributes,
          id: 'testAppName:testKeyName2',
          attributes: { count: 5 },
        },
        {
          ...commonSavedObjectsAttributes,
          id: 'testAppName2:testKeyName3',
          attributes: { count: 1 },
        },
        {
          ...commonSavedObjectsAttributes,
          id: 'kibana-user_agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:80.0) Gecko/20100101 Firefox/80.0',
          attributes: { count: 1 },
        },
      ],
      total: 3,
      per_page: 3,
      page: 1,
    });

    getUsageCollector.mockImplementation(() => savedObjectClient);

    expect(await collector.fetch(mockedFetchContext)).toStrictEqual({
      testAppName: [
        { key: 'testKeyName1', value: 3 },
        { key: 'testKeyName2', value: 5 },
      ],
      testAppName2: [{ key: 'testKeyName3', value: 1 }],
      'kibana-user_agent': [
        {
          key: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:80.0) Gecko/20100101 Firefox/80.0',
          value: 1,
        },
      ],
    });
  });
});
