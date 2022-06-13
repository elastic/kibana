/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  Collector,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { MAIN_APP_DEFAULT_VIEW_ID } from '@kbn/usage-collection-plugin/common/constants';
import { createCollectorFetchContextMock } from '@kbn/usage-collection-plugin/server/mocks';
import {
  registerApplicationUsageCollector,
  transformByApplicationViews,
} from './telemetry_application_usage_collector';
import { ApplicationUsageViews } from './types';

import { SAVED_OBJECTS_DAILY_TYPE, SAVED_OBJECTS_TOTAL_TYPE } from './saved_objects_types';

// use fake timers to avoid triggering rollups during tests
jest.useFakeTimers();

describe('telemetry_application_usage', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let collector: Collector<unknown>;
  let usageCollectionMock: ReturnType<typeof createUsageCollectionSetupMock>;
  let savedObjectClient: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let getSavedObjectClient: jest.MockedFunction<() => undefined | typeof savedObjectClient>;

  const registerType = jest.fn();
  const mockedFetchContext = createCollectorFetchContextMock();

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    usageCollectionMock = createUsageCollectionSetupMock();
    savedObjectClient = savedObjectsRepositoryMock.create();
    getSavedObjectClient = jest.fn().mockReturnValue(savedObjectClient);
    usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
      collector = new Collector(logger, config);
      return createUsageCollectionSetupMock().makeUsageCollector(config);
    });
    registerApplicationUsageCollector(
      logger,
      usageCollectionMock,
      registerType,
      getSavedObjectClient
    );
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
  });

  test('if no savedObjectClient initialised, return undefined', async () => {
    getSavedObjectClient.mockReturnValue(undefined);

    expect(collector.isReady()).toBe(false);
    expect(await collector.fetch(mockedFetchContext)).toBeUndefined();
  });

  test('calls `savedObjectsClient.find` with the correct parameters', async () => {
    savedObjectClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 20,
      page: 0,
    });

    await collector.fetch(mockedFetchContext);

    expect(savedObjectClient.find).toHaveBeenCalledTimes(2);

    expect(savedObjectClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SAVED_OBJECTS_TOTAL_TYPE,
      })
    );
    expect(savedObjectClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SAVED_OBJECTS_DAILY_TYPE,
      })
    );
  });

  test('when savedObjectClient is initialised, return something', async () => {
    savedObjectClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 20,
      page: 0,
    });

    expect(collector.isReady()).toBe(true);
    expect(await collector.fetch(mockedFetchContext)).toStrictEqual({});
    expect(savedObjectClient.bulkCreate).not.toHaveBeenCalled();
  });

  test('it aggregates total and daily data', async () => {
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
                type: opts.type,
                references: [],
                score: 0,
              },
            ],
            total: 1,
            per_page: 10,
            page: 1,
          };
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
                type: opts.type,
                references: [],
                score: 0,
              },
            ],
            total: 1,
            per_page: 10,
            page: 1,
          };
        default:
          return {
            saved_objects: [],
            total: 0,
            per_page: 10,
            page: 1,
          };
      }
    });

    expect(await collector.fetch(mockedFetchContext)).toStrictEqual({
      appId: {
        appId: 'appId',
        viewId: 'main',
        clicks_total: 1 + 10,
        clicks_7_days: 1,
        clicks_30_days: 1,
        clicks_90_days: 1,
        minutes_on_screen_total: 0.5 + 10,
        minutes_on_screen_7_days: 0.5,
        minutes_on_screen_30_days: 0.5,
        minutes_on_screen_90_days: 0.5,
        views: [],
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
