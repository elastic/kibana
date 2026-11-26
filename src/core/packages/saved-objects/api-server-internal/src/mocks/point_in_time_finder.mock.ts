/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, Mocked } from 'vitest';
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
  savedObjectsMock: Mocked<
    ISavedObjectsRepository | SavedObjectsClientContract | SavedObjectsPointInTimeFinderClient
  >;
}): Mock => {
  const mock = vi.fn();

  // To simplify testing, we use the actual implementation here, but pass through the
  // mocked dependencies. This allows users to set their own `mockResolvedValue` on
  // the SO client mock and have it reflected when using `createPointInTimeFinder`.
  mock.mockImplementation((findOptions) => {
    const finder = new PointInTimeFinder(findOptions, {
      logger,
      client: savedObjectsMock,
    });

    vi.spyOn(finder, 'find');
    vi.spyOn(finder, 'close');

    return finder;
  });

  return mock;
};

const createPointInTimeFinderClientMock = (): Mocked<SavedObjectsPointInTimeFinderClient> => {
  return {
    find: vi.fn() as Mock,
    openPointInTimeForType: vi.fn().mockResolvedValue({ id: 'some_pit_id' }),
    closePointInTime: vi.fn(),
  };
};

export const savedObjectsPointInTimeFinderMock = {
  create: createPointInTimeFinderMock,
  createClient: createPointInTimeFinderClientMock,
};
