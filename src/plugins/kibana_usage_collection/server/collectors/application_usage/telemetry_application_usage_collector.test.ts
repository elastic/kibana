/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { savedObjectsRepositoryMock, loggingSystemMock } from '../../../../../core/server/mocks';
import {
  Collector,
  createUsageCollectionSetupMock,
} from '../../../../usage_collection/server/usage_collection.mock';

import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';
import { ROLL_TOTAL_INDICES_INTERVAL, ROLL_INDICES_START } from './constants';
import {
  registerApplicationUsageCollector,
  transformByApplicationViews,
  ApplicationUsageViews,
} from './telemetry_application_usage_collector';
import { MAIN_APP_DEFAULT_VIEW_ID } from '../../../../usage_collection/common/constants';
import {
  SAVED_OBJECTS_DAILY_TYPE,
  SAVED_OBJECTS_TOTAL_TYPE,
  SAVED_OBJECTS_TRANSACTIONAL_TYPE,
} from './saved_objects_types';

describe('telemetry_application_usage', () => {
  jest.useFakeTimers();

  const logger = loggingSystemMock.createLogger();

  let collector: Collector<unknown>;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = new Collector(logger, config);
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
        appId: 'appId',
        viewId: 'main',
        clicks_total: total + 1 + 10,
        clicks_7_days: total + 1,
        clicks_30_days: total + 1,
        clicks_90_days: total + 1,
        minutes_on_screen_total: (total + 1) * 0.5 + 10,
        minutes_on_screen_7_days: (total + 1) * 0.5,
        minutes_on_screen_30_days: (total + 1) * 0.5,
        minutes_on_screen_90_days: (total + 1) * 0.5,
        views: [],
      },
    });
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          id: 'appId',
          type: SAVED_OBJECTS_TOTAL_TYPE,
          attributes: {
            appId: 'appId',
            viewId: 'main',
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
              {
                id: 'test-id-2',
                attributes: {
                  appId: 'appId',
                  viewId: 'main',
                  timestamp: new Date(0).toISOString(),
                  minutesOnScreen: 2,
                  numberOfClicks: 2,
                },
              },
              {
                id: 'test-id-3',
                attributes: {
                  appId: 'appId',
                  viewId: 'viewId-1',
                  timestamp: new Date(0).toISOString(),
                  minutesOnScreen: 1,
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
        appId: 'appId',
        viewId: 'main',
        clicks_total: 3,
        clicks_7_days: 0,
        clicks_30_days: 0,
        clicks_90_days: 0,
        minutes_on_screen_total: 2.5,
        minutes_on_screen_7_days: 0,
        minutes_on_screen_30_days: 0,
        minutes_on_screen_90_days: 0,
        views: [
          {
            appId: 'appId',
            viewId: 'viewId-1',
            clicks_total: 1,
            clicks_7_days: 0,
            clicks_30_days: 0,
            clicks_90_days: 0,
            minutes_on_screen_total: 1,
            minutes_on_screen_7_days: 0,
            minutes_on_screen_30_days: 0,
            minutes_on_screen_90_days: 0,
          },
        ],
      },
    });
  });
});

describe('transformByApplicationViews', () => {
  it(`uses '${MAIN_APP_DEFAULT_VIEW_ID}' as the top level metric`, () => {
    const report: ApplicationUsageViews = {
      randomId1: {
        appId: 'appId1',
        viewId: MAIN_APP_DEFAULT_VIEW_ID,
        clicks_total: 1,
        clicks_7_days: 0,
        clicks_30_days: 0,
        clicks_90_days: 0,
        minutes_on_screen_total: 1,
        minutes_on_screen_7_days: 0,
        minutes_on_screen_30_days: 0,
        minutes_on_screen_90_days: 0,
      },
    };

    const result = transformByApplicationViews(report);

    expect(result).toEqual({
      appId1: {
        appId: 'appId1',
        viewId: MAIN_APP_DEFAULT_VIEW_ID,
        clicks_total: 1,
        clicks_7_days: 0,
        clicks_30_days: 0,
        clicks_90_days: 0,
        minutes_on_screen_total: 1,
        minutes_on_screen_7_days: 0,
        minutes_on_screen_30_days: 0,
        minutes_on_screen_90_days: 0,
        views: [],
      },
    });
  });

  it('nests views under each application', () => {
    const report: ApplicationUsageViews = {
      randomId1: {
        appId: 'appId1',
        viewId: MAIN_APP_DEFAULT_VIEW_ID,
        clicks_total: 1,
        clicks_7_days: 0,
        clicks_30_days: 0,
        clicks_90_days: 0,
        minutes_on_screen_total: 1,
        minutes_on_screen_7_days: 0,
        minutes_on_screen_30_days: 0,
        minutes_on_screen_90_days: 0,
      },
      randomId2: {
        appId: 'appId1',
        viewId: 'appView1',
        clicks_total: 1,
        clicks_7_days: 0,
        clicks_30_days: 0,
        clicks_90_days: 0,
        minutes_on_screen_total: 1,
        minutes_on_screen_7_days: 0,
        minutes_on_screen_30_days: 0,
        minutes_on_screen_90_days: 0,
      },
    };

    const result = transformByApplicationViews(report);

    expect(result).toEqual({
      appId1: {
        appId: 'appId1',
        viewId: MAIN_APP_DEFAULT_VIEW_ID,
        clicks_total: 1,
        clicks_7_days: 0,
        clicks_30_days: 0,
        clicks_90_days: 0,
        minutes_on_screen_total: 1,
        minutes_on_screen_7_days: 0,
        minutes_on_screen_30_days: 0,
        minutes_on_screen_90_days: 0,
        views: [
          {
            appId: 'appId1',
            viewId: 'appView1',
            clicks_total: 1,
            clicks_7_days: 0,
            clicks_30_days: 0,
            clicks_90_days: 0,
            minutes_on_screen_total: 1,
            minutes_on_screen_7_days: 0,
            minutes_on_screen_30_days: 0,
            minutes_on_screen_90_days: 0,
          },
        ],
      },
    });
  });
});
