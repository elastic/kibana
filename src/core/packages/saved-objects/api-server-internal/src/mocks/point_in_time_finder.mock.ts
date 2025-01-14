/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObjectsPointInTimeFinderClient,
} from '@kbn/core-saved-objects-api-server';
import { PointInTimeFinder } from '../lib/point_in_time_finder';

// mock duplicated from `@kbn/core/saved-objects-api-server-mocks` to avoid cyclic dependencies

const createPointInTimeFinderMock = ({
  logger = loggerMock.create(),
  savedObjectsMock,
}: {
  logger?: MockedLogger;
  savedObjectsMock: jest.Mocked<
    ISavedObjectsRepository | SavedObjectsClientContract | SavedObjectsPointInTimeFinderClient
  >;
}): jest.Mock => {
  const mock = jest.fn();

  // To simplify testing, we use the actual implementation here, but pass through the
  // mocked dependencies. This allows users to set their own `mockResolvedValue` on
  // the SO client mock and have it reflected when using `createPointInTimeFinder`.
  mock.mockImplementation((findOptions) => {
    const finder = new PointInTimeFinder(findOptions, {
      logger,
      client: savedObjectsMock,
    });

    jest.spyOn(finder, 'find');
    jest.spyOn(finder, 'close');

    return finder;
  });

  return mock;
};

const createPointInTimeFinderClientMock = (): jest.Mocked<SavedObjectsPointInTimeFinderClient> => {
  return {
    find: jest.fn(),
    openPointInTimeForType: jest.fn().mockResolvedValue({ id: 'some_pit_id' }),
    closePointInTime: jest.fn(),
  };
};

export const savedObjectsPointInTimeFinderMock = {
  create: createPointInTimeFinderMock,
  createClient: createPointInTimeFinderClientMock,
};
