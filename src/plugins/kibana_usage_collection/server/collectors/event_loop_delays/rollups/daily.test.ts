/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rollDailyData } from './daily';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { SavedObjectsFindResponse } from '@kbn/core/server';

describe('rollDailyData', () => {
  const logger = loggingSystemMock.createLogger();
  const mockSavedObjectsClient = savedObjectsRepositoryMock.create();

  beforeEach(() => jest.clearAllMocks());

  it('returns false if no savedObjectsClient', async () => {
    await rollDailyData(logger, undefined);
    expect(mockSavedObjectsClient.find).toBeCalledTimes(0);
  });

  it('calls delete on documents older than 3 days', async () => {
    mockSavedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [{ id: 'test_id_1' }, { id: 'test_id_2' }],
    } as SavedObjectsFindResponse);

    await rollDailyData(logger, mockSavedObjectsClient);

    expect(mockSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(mockSavedObjectsClient.delete).toBeCalledTimes(2);
    expect(mockSavedObjectsClient.delete).toHaveBeenNthCalledWith(
      1,
      'event_loop_delays_daily',
      'test_id_1'
    );
    expect(mockSavedObjectsClient.delete).toHaveBeenNthCalledWith(
      2,
      'event_loop_delays_daily',
      'test_id_2'
    );
  });

  it('calls logger.debug on repository find error', async () => {
    const mockError = new Error('find error');
    mockSavedObjectsClient.find.mockRejectedValueOnce(mockError);

    await rollDailyData(logger, mockSavedObjectsClient);
    expect(logger.debug).toBeCalledTimes(2);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      'Failed to rollup transactional to daily entries'
    );
    expect(logger.debug).toHaveBeenNthCalledWith(2, mockError);
  });

  it('settles all deletes before logging failures', async () => {
    const mockError1 = new Error('delete error 1');
    const mockError2 = new Error('delete error 2');
    mockSavedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [{ id: 'test_id_1' }, { id: 'test_id_2' }, { id: 'test_id_3' }],
    } as SavedObjectsFindResponse);

    mockSavedObjectsClient.delete.mockRejectedValueOnce(mockError1);
    mockSavedObjectsClient.delete.mockResolvedValueOnce(true);
    mockSavedObjectsClient.delete.mockRejectedValueOnce(mockError2);

    await rollDailyData(logger, mockSavedObjectsClient);
    expect(mockSavedObjectsClient.delete).toBeCalledTimes(3);
    expect(logger.debug).toBeCalledTimes(2);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      'Failed to rollup transactional to daily entries'
    );
    expect(logger.debug).toHaveBeenNthCalledWith(2, [
      { reason: mockError1, status: 'rejected' },
      { reason: mockError2, status: 'rejected' },
    ]);
  });
});
