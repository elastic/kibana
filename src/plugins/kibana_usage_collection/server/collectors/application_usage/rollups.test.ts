/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { rollDailyData, rollTotals } from './rollups';
import { savedObjectsRepositoryMock, loggingSystemMock } from '../../../../../core/server/mocks';
import { MAIN_APP_DEFAULT_VIEW_ID } from '../../../../usage_collection/common/constants';
import { SavedObjectsErrorHelpers } from '../../../../../core/server';
import {
  SAVED_OBJECTS_DAILY_TYPE,
  SAVED_OBJECTS_TOTAL_TYPE,
  SAVED_OBJECTS_TRANSACTIONAL_TYPE,
} from './saved_objects_types';

describe('rollDailyData', () => {
  const logger = loggingSystemMock.createLogger();

  test('returns undefined if no savedObjectsClient initialised yet', async () => {
    await expect(rollDailyData(logger, undefined)).resolves.toBe(undefined);
  });

  test('handle empty results', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    savedObjectClient.find.mockImplementation(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case SAVED_OBJECTS_TRANSACTIONAL_TYPE:
          return { saved_objects: [], total: 0, page, per_page: perPage };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });
    await expect(rollDailyData(logger, savedObjectClient)).resolves.toBe(undefined);
    expect(savedObjectClient.get).not.toBeCalled();
    expect(savedObjectClient.bulkCreate).not.toBeCalled();
    expect(savedObjectClient.delete).not.toBeCalled();
  });

  test('migrate some docs', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    let timesCalled = 0;
    savedObjectClient.find.mockImplementation(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case SAVED_OBJECTS_TRANSACTIONAL_TYPE:
          if (timesCalled++ > 0) {
            return { saved_objects: [], total: 0, page, per_page: perPage };
          }
          return {
            saved_objects: [
              {
                id: 'test-id-1',
                type,
                score: 0,
                references: [],
                attributes: {
                  appId: 'appId',
                  timestamp: '2020-01-01T10:31:00.000Z',
                  minutesOnScreen: 0.5,
                  numberOfClicks: 1,
                },
              },
              {
                id: 'test-id-2',
                type,
                score: 0,
                references: [],
                attributes: {
                  appId: 'appId',
                  timestamp: '2020-01-01T11:31:00.000Z',
                  minutesOnScreen: 2.5,
                  numberOfClicks: 2,
                },
              },
              {
                id: 'test-id-3',
                type,
                score: 0,
                references: [],
                attributes: {
                  appId: 'appId',
                  viewId: 'appId_viewId',
                  timestamp: '2020-01-01T11:31:00.000Z',
                  minutesOnScreen: 1,
                  numberOfClicks: 5,
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

    savedObjectClient.get.mockImplementation(async (type, id) => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    });

    await expect(rollDailyData(logger, savedObjectClient)).resolves.toBe(undefined);
    expect(savedObjectClient.get).toHaveBeenCalledTimes(2);
    expect(savedObjectClient.get).toHaveBeenNthCalledWith(
      1,
      SAVED_OBJECTS_DAILY_TYPE,
      'appId:2020-01-01'
    );
    expect(savedObjectClient.get).toHaveBeenNthCalledWith(
      2,
      SAVED_OBJECTS_DAILY_TYPE,
      'appId:2020-01-01:appId_viewId'
    );
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: SAVED_OBJECTS_DAILY_TYPE,
          id: 'appId:2020-01-01',
          attributes: {
            appId: 'appId',
            viewId: undefined,
            timestamp: '2020-01-01T00:00:00.000Z',
            minutesOnScreen: 3.0,
            numberOfClicks: 3,
          },
        },
        {
          type: SAVED_OBJECTS_DAILY_TYPE,
          id: 'appId:2020-01-01:appId_viewId',
          attributes: {
            appId: 'appId',
            viewId: 'appId_viewId',
            timestamp: '2020-01-01T00:00:00.000Z',
            minutesOnScreen: 1.0,
            numberOfClicks: 5,
          },
        },
      ],
      { overwrite: true }
    );
    expect(savedObjectClient.delete).toHaveBeenCalledTimes(3);
    expect(savedObjectClient.delete).toHaveBeenNthCalledWith(
      1,
      SAVED_OBJECTS_TRANSACTIONAL_TYPE,
      'test-id-1'
    );
    expect(savedObjectClient.delete).toHaveBeenNthCalledWith(
      2,
      SAVED_OBJECTS_TRANSACTIONAL_TYPE,
      'test-id-2'
    );
    expect(savedObjectClient.delete).toHaveBeenNthCalledWith(
      3,
      SAVED_OBJECTS_TRANSACTIONAL_TYPE,
      'test-id-3'
    );
  });

  test('error getting the daily document', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    let timesCalled = 0;
    savedObjectClient.find.mockImplementation(async ({ type, page = 1, perPage = 10 }) => {
      switch (type) {
        case SAVED_OBJECTS_TRANSACTIONAL_TYPE:
          if (timesCalled++ > 0) {
            return { saved_objects: [], total: 0, page, per_page: perPage };
          }
          return {
            saved_objects: [
              {
                id: 'test-id-1',
                type,
                score: 0,
                references: [],
                attributes: {
                  appId: 'appId',
                  timestamp: '2020-01-01T10:31:00.000Z',
                  minutesOnScreen: 0.5,
                  numberOfClicks: 1,
                },
              },
            ],
            total: 1,
            page,
            per_page: perPage,
          };
        default:
          throw new Error(`Unexpected type [${type}]`);
      }
    });

    savedObjectClient.get.mockImplementation(async (type, id) => {
      throw new Error('Something went terribly wrong');
    });

    await expect(rollDailyData(logger, savedObjectClient)).resolves.toBe(undefined);
    expect(savedObjectClient.get).toHaveBeenCalledTimes(1);
    expect(savedObjectClient.get).toHaveBeenCalledWith(
      SAVED_OBJECTS_DAILY_TYPE,
      'appId:2020-01-01'
    );
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledTimes(0);
    expect(savedObjectClient.delete).toHaveBeenCalledTimes(0);
  });
});

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
