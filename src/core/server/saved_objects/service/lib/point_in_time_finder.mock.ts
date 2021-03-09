/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock, MockedLogger } from '../../../logging/logger.mock';
import type { SavedObjectsClientContract } from '../../types';
import type { SavedObjectsFindResponse } from '../saved_objects_client';
import type { ISavedObjectsRepository } from './repository';
import { PointInTimeFinder } from './point_in_time_finder';

const mockHits: SavedObjectsFindResponse[] = [
  {
    total: 1,
    saved_objects: [
      {
        id: '1',
        type: 'visualization',
        attributes: {
          title: 'test vis',
        },
        score: 1,
        references: [],
      },
    ],
    pit_id: 'test',
    per_page: 1,
    page: 1,
  },
];

const createPointInTimeFinderMock = ({
  logger = loggerMock.create(),
  savedObjectsMock,
}: {
  logger?: MockedLogger;
  savedObjectsMock: jest.Mocked<ISavedObjectsRepository | SavedObjectsClientContract>;
}): jest.Mock => {
  const mock = jest.fn();

  for (const hit of mockHits) {
    savedObjectsMock.find.mockResolvedValue(hit);
  }

  mock.mockImplementation((findOptions) => {
    return new PointInTimeFinder(findOptions, {
      logger,
      find: savedObjectsMock.find,
      openPointInTimeForType: savedObjectsMock.openPointInTimeForType,
      closePointInTime: savedObjectsMock.closePointInTime,
    });
  });

  return mock;
};

export const savedObjectsPointInTimeFinderMock = {
  create: createPointInTimeFinderMock,
};
