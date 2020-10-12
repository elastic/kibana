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

import { rollDailyData, rollTotals } from './rollups';
import { savedObjectsRepositoryMock, loggingSystemMock } from '../../../../../core/server/mocks';
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
                  minutesOnScreen: 1.5,
                  numberOfClicks: 2,
                },
              },
            ],
            total: 2,
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
    expect(savedObjectClient.get).toHaveBeenCalledTimes(1);
    expect(savedObjectClient.get).toHaveBeenCalledWith(
      SAVED_OBJECTS_DAILY_TYPE,
      'appId:2020-01-01'
    );
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: SAVED_OBJECTS_DAILY_TYPE,
          id: 'appId:2020-01-01',
          attributes: {
            appId: 'appId',
            timestamp: '2020-01-01T00:00:00.000Z',
            minutesOnScreen: 2.0,
            numberOfClicks: 3,
          },
        },
      ],
      { overwrite: true }
    );
    expect(savedObjectClient.delete).toHaveBeenCalledTimes(2);
    expect(savedObjectClient.delete).toHaveBeenCalledWith(
      SAVED_OBJECTS_TRANSACTIONAL_TYPE,
      'test-id-1'
    );
    expect(savedObjectClient.delete).toHaveBeenCalledWith(
      SAVED_OBJECTS_TRANSACTIONAL_TYPE,
      'test-id-2'
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
                  minutesOnScreen: 1.5,
                  numberOfClicks: 2,
                },
              },
            ],
            total: 2,
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
            ],
            total: 1,
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
            minutesOnScreen: 2.0,
            numberOfClicks: 3,
          },
        },
        {
          type: SAVED_OBJECTS_TOTAL_TYPE,
          id: 'appId-2',
          attributes: {
            appId: 'appId-2',
            minutesOnScreen: 0.5,
            numberOfClicks: 1,
          },
        },
      ],
      { overwrite: true }
    );
    expect(savedObjectClient.delete).toHaveBeenCalledTimes(2);
    expect(savedObjectClient.delete).toHaveBeenCalledWith(
      SAVED_OBJECTS_DAILY_TYPE,
      'appId-2:2020-01-01'
    );
    expect(savedObjectClient.delete).toHaveBeenCalledWith(
      SAVED_OBJECTS_DAILY_TYPE,
      'appId-1:2020-01-01'
    );
  });
});
