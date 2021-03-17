/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock, MockedLogger } from '../../../logging/logger.mock';
import type { SavedObjectsClientContract } from '../../types';
import type { ISavedObjectsRepository } from './repository';
import { PointInTimeFinder } from './point_in_time_finder';

const createPointInTimeFinderMock = ({
  logger = loggerMock.create(),
  savedObjectsMock,
}: {
  logger?: MockedLogger;
  savedObjectsMock: jest.Mocked<ISavedObjectsRepository | SavedObjectsClientContract>;
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

export const savedObjectsPointInTimeFinderMock = {
  create: createPointInTimeFinderMock,
};
