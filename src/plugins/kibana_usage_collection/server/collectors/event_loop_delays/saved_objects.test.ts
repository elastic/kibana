/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { storeHistogram, serializeSavedObjectId } from './saved_objects';
import { savedObjectsRepositoryMock } from '../../../../../core/server/mocks';
import { mocked } from './event_loop_delays.mocks';
import moment from 'moment';

describe('serializeSavedObjectId', () => {
  it('returns serialized id', () => {
    const id = serializeSavedObjectId({ date: 1623233091278, pid: 123 });
    expect(id).toBe('123::09062021');
  });
});

describe('storeHistogram', () => {
  const mockHistogram = mocked.createHistogram();
  const mockInternalRepository = savedObjectsRepositoryMock.create();

  jest.useFakeTimers('modern');
  const mockNow = jest.getRealSystemTime();
  jest.setSystemTime(mockNow);

  beforeEach(() => jest.clearAllMocks());
  afterAll(() => jest.useRealTimers());

  it('stores histogram data in a savedObject', async () => {
    await storeHistogram(mockHistogram, mockInternalRepository);
    const pid = process.pid;
    const id = serializeSavedObjectId({ date: mockNow, pid });

    expect(mockInternalRepository.create).toBeCalledWith(
      'event_loop_delays_daily',
      { ...mockHistogram, processId: pid, timestamp: moment(mockNow).toISOString() },
      { id, overwrite: true }
    );
  });
});
