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

import { savedObjectsRepositoryMock, loggingSystemMock } from '../../../../../core/server/mocks';
import {
  CollectorOptions,
  createUsageCollectionSetupMock,
} from '../../../../usage_collection/server/usage_collection.mock';

import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';
import {
  ROLL_INDICES_START,
  ROLL_TOTAL_INDICES_INTERVAL,
  registerApplicationUsageCollector,
} from './telemetry_application_usage_collector';
import {
  SAVED_OBJECTS_DAILY_TYPE,
  SAVED_OBJECTS_TOTAL_TYPE,
  SAVED_OBJECTS_TRANSACTIONAL_TYPE,
} from './saved_objects_types';

describe('telemetry_application_usage', () => {
  jest.useFakeTimers();

  const logger = loggingSystemMock.createLogger();

  let collector: CollectorOptions;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = config;
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const getUsageCollector = jest.fn();
  const registerType = jest.fn();
  const mockedFetchContext = createCollectorFetchContextMock();

  beforeAll(() =>
    registerApplicationUsageCollector(logger, usageCollectionMock, registerType, getUsageCollector)
  );
  afterAll(() => jest.clearAllTimers());

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
  });

  test('if no savedObjectClient initialised, return undefined', async () => {
    expect(collector.isReady()).toBe(false);
    expect(await collector.fetch(mockedFetchContext)).toBeUndefined();
    jest.runTimersToTime(ROLL_INDICES_START);
  });

  test('when savedObjectClient is initialised, return something', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    savedObjectClient.find.mockImplementation(
      async () =>
        ({
          saved_objects: [],
          total: 0,
        } as any)
    );
    getUsageCollector.mockImplementation(() => savedObjectClient);

    jest.runTimersToTime(ROLL_TOTAL_INDICES_INTERVAL); // Force rollTotals to run

    expect(collector.isReady()).toBe(true);
    expect(await collector.fetch(mockedFetchContext)).toStrictEqual({});
    expect(savedObjectClient.bulkCreate).not.toHaveBeenCalled();
  });

  test('it only gets 10k even when there are more documents (ES limitation)', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    const total = 10000;
    savedObjectClient.find.mockImplementation(async (opts) => {
      switch (opts.type) {
        case SAVED_OBJECTS_TOTAL_TYPE:
          return {
            saved_objects: [
              {
                id: 'appId',
                attributes: {
                  appId: 'appId',
                  minutesOnScreen: 10,
                  numberOfClicks: 10,
                },
              },
            ],
            total: 1,
          } as any;
        case SAVED_OBJECTS_TRANSACTIONAL_TYPE:
          const doc = {
            id: 'test-id',
            attributes: {
              appId: 'appId',
              timestamp: new Date().toISOString(),
              minutesOnScreen: 0.5,
              numberOfClicks: 1,
            },
          };
          const savedObjects = new Array(total).fill(doc);
          return { saved_objects: savedObjects, total: total + 1 };
        case SAVED_OBJECTS_DAILY_TYPE:
          return {
            saved_objects: [
              {
                id: 'appId:YYYY-MM-DD',
                attributes: {
                  appId: 'appId',
                  timestamp: new Date().toISOString(),
                  minutesOnScreen: 0.5,
                  numberOfClicks: 1,
                },
              },
            ],
            total: 1,
          };
      }
    });

    getUsageCollector.mockImplementation(() => savedObjectClient);

    jest.runTimersToTime(ROLL_TOTAL_INDICES_INTERVAL); // Force rollTotals to run

    expect(await collector.fetch(mockedFetchContext)).toStrictEqual({
      appId: {
        clicks_total: total + 1 + 10,
        clicks_7_days: total + 1,
        clicks_30_days: total + 1,
        clicks_90_days: total + 1,
        minutes_on_screen_total: (total + 1) * 0.5 + 10,
        minutes_on_screen_7_days: (total + 1) * 0.5,
        minutes_on_screen_30_days: (total + 1) * 0.5,
        minutes_on_screen_90_days: (total + 1) * 0.5,
      },
    });
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          id: 'appId',
          type: SAVED_OBJECTS_TOTAL_TYPE,
          attributes: {
            appId: 'appId',
            minutesOnScreen: 10.5,
            numberOfClicks: 11,
          },
        },
      ],
      { overwrite: true }
    );
    expect(savedObjectClient.delete).toHaveBeenCalledTimes(1);
    expect(savedObjectClient.delete).toHaveBeenCalledWith(
      SAVED_OBJECTS_DAILY_TYPE,
      'appId:YYYY-MM-DD'
    );
  });

  test('old transactional data not migrated yet', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    savedObjectClient.find.mockImplementation(async (opts) => {
      switch (opts.type) {
        case SAVED_OBJECTS_TOTAL_TYPE:
        case SAVED_OBJECTS_DAILY_TYPE:
          return { saved_objects: [], total: 0 } as any;
        case SAVED_OBJECTS_TRANSACTIONAL_TYPE:
          return {
            saved_objects: [
              {
                id: 'test-id',
                attributes: {
                  appId: 'appId',
                  timestamp: new Date(0).toISOString(),
                  minutesOnScreen: 0.5,
                  numberOfClicks: 1,
                },
              },
            ],
            total: 1,
          };
      }
    });

    getUsageCollector.mockImplementation(() => savedObjectClient);

    expect(await collector.fetch(mockedFetchContext)).toStrictEqual({
      appId: {
        clicks_total: 1,
        clicks_7_days: 0,
        clicks_30_days: 0,
        clicks_90_days: 0,
        minutes_on_screen_total: 0.5,
        minutes_on_screen_7_days: 0,
        minutes_on_screen_30_days: 0,
        minutes_on_screen_90_days: 0,
      },
    });
  });
});
