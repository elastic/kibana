/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { MAIN_APP_DEFAULT_VIEW_ID } from '@kbn/usage-collection-plugin/common/constants';
import { SAVED_OBJECTS_DAILY_TYPE, SAVED_OBJECTS_TOTAL_TYPE } from '../saved_objects_types';
import { rollTotals } from './total';

describe('rollTotals', () => {
  const logger = loggingSystemMock.createLogger();

  test('returns undefined if no savedObjectsClient initialised yet', async () => {
    await expect(rollTotals(logger, undefined)).resolves.toBe(undefined);
  });

  test('handle empty results', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    savedObjectClient.find.mockImplementation(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case SAVED_OBJECTS_DAILY_TYPE:
        case SAVED_OBJECTS_TOTAL_TYPE:
          return { saved_objects: [], total: 0, page, per_page: perPage };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    await expect(rollTotals(logger, savedObjectClient)).resolves.toBe(undefined);
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledTimes(0);
    expect(savedObjectClient.delete).toHaveBeenCalledTimes(0);
  });

  test('migrate some documents', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    savedObjectClient.find.mockImplementation(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case SAVED_OBJECTS_DAILY_TYPE:
          return {
            saved_objects: [
              {
                id: 'appId-2:2020-01-01',
                type,
                score: 0,
                references: [],
                attributes: {
                  appId: 'appId-2',
                  timestamp: '2020-01-01T10:31:00.000Z',
                  minutesOnScreen: 0.5,
                  numberOfClicks: 1,
                },
              },
              {
                id: 'appId-1:2020-01-01',
                type,
                score: 0,
                references: [],
                attributes: {
                  appId: 'appId-1',
                  timestamp: '2020-01-01T11:31:00.000Z',
                  minutesOnScreen: 2.5,
                  numberOfClicks: 2,
                },
              },
              {
                id: 'appId-1:2020-01-01:viewId-1',
                type,
                score: 0,
                references: [],
                attributes: {
                  appId: 'appId-1',
                  viewId: 'viewId-1',
                  timestamp: '2020-01-01T11:31:00.000Z',
                  minutesOnScreen: 1,
                  numberOfClicks: 1,
                },
              },
            ],
            total: 3,
            page,
            per_page: perPage,
          };
        case SAVED_OBJECTS_TOTAL_TYPE:
          return {
            saved_objects: [
              {
                id: 'appId-1',
                type,
                score: 0,
                references: [],
                attributes: {
                  appId: 'appId-1',
                  minutesOnScreen: 0.5,
                  numberOfClicks: 1,
                },
              },
              {
                id: 'appId-1___viewId-1',
                type,
                score: 0,
                references: [],
                attributes: {
                  appId: 'appId-1',
                  viewId: 'viewId-1',
                  minutesOnScreen: 4,
                  numberOfClicks: 2,
                },
              },
              {
                id: 'appId-2___viewId-1',
                type,
                score: 0,
                references: [],
                attributes: {
                  appId: 'appId-2',
                  viewId: 'viewId-1',
                  minutesOnScreen: 1,
                  numberOfClicks: 1,
                },
              },
            ],
            total: 3,
            page,
            per_page: perPage,
          };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    await expect(rollTotals(logger, savedObjectClient)).resolves.toBe(undefined);
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: SAVED_OBJECTS_TOTAL_TYPE,
          id: 'appId-1',
          attributes: {
            appId: 'appId-1',
            viewId: MAIN_APP_DEFAULT_VIEW_ID,
            minutesOnScreen: 3.0,
            numberOfClicks: 3,
          },
        },
        {
          type: SAVED_OBJECTS_TOTAL_TYPE,
          id: 'appId-1___viewId-1',
          attributes: {
            appId: 'appId-1',
            viewId: 'viewId-1',
            minutesOnScreen: 5.0,
            numberOfClicks: 3,
          },
        },
        {
          type: SAVED_OBJECTS_TOTAL_TYPE,
          id: 'appId-2___viewId-1',
          attributes: {
            appId: 'appId-2',
            viewId: 'viewId-1',
            minutesOnScreen: 1.0,
            numberOfClicks: 1,
          },
        },
        {
          type: SAVED_OBJECTS_TOTAL_TYPE,
          id: 'appId-2',
          attributes: {
            appId: 'appId-2',
            viewId: MAIN_APP_DEFAULT_VIEW_ID,
            minutesOnScreen: 0.5,
            numberOfClicks: 1,
          },
        },
      ],
      { overwrite: true }
    );
    expect(savedObjectClient.delete).toHaveBeenCalledTimes(3);
    expect(savedObjectClient.delete).toHaveBeenCalledWith(
      SAVED_OBJECTS_DAILY_TYPE,
      'appId-2:2020-01-01'
    );
    expect(savedObjectClient.delete).toHaveBeenCalledWith(
      SAVED_OBJECTS_DAILY_TYPE,
      'appId-1:2020-01-01'
    );
    expect(savedObjectClient.delete).toHaveBeenCalledWith(
      SAVED_OBJECTS_DAILY_TYPE,
      'appId-1:2020-01-01:viewId-1'
    );
  });
});
