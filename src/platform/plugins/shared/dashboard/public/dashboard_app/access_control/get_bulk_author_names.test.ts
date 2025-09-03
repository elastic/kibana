/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBulkAuthorNames } from './get_bulk_author_names';
import { coreServices } from '../../services/kibana_services';

jest.mock('../../services/kibana_services', () => ({
  coreServices: {
    userProfile: {
      bulkGet: jest.fn(),
    },
  },
}));

describe('getBulkAuthorNames', () => {
  const mockBulkGet = coreServices.userProfile.bulkGet as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when input array is empty', async () => {
    const result = await getBulkAuthorNames([]);

    expect(result).toEqual([]);
    expect(mockBulkGet).not.toHaveBeenCalled();
  });

  it('should return empty array when all input values are undefined', async () => {
    const result = await getBulkAuthorNames([undefined, undefined]);

    expect(result).toEqual([]);
    expect(mockBulkGet).not.toHaveBeenCalled();
  });

  it('should return user data with id and username', async () => {
    const mockProfiles = [
      {
        uid: 'user-123',
        user: { username: 'testuser' },
      },
    ];

    mockBulkGet.mockResolvedValue(mockProfiles);

    const result = await getBulkAuthorNames(['user-123']);

    expect(result).toEqual([{ id: 'user-123', username: 'testuser' }]);
  });

  it('should filter out undefined values and call bulkGet with valid IDs', async () => {
    const mockProfiles = [
      {
        uid: 'user-1',
        user: { username: 'alice' },
      },
      {
        uid: 'user-2',
        user: { username: 'bob' },
      },
    ];

    mockBulkGet.mockResolvedValue(mockProfiles);

    const result = await getBulkAuthorNames(['user-1', undefined, 'user-2']);

    expect(mockBulkGet).toHaveBeenCalledWith({
      uids: new Set(['user-1', 'user-2']),
    });
    expect(result).toEqual([
      { id: 'user-1', username: 'alice' },
      { id: 'user-2', username: 'bob' },
    ]);
  });

  it('should return empty array when bulkGet throws an error', async () => {
    mockBulkGet.mockRejectedValue(new Error('Network error'));

    const result = await getBulkAuthorNames(['user-1', 'user-2']);

    expect(mockBulkGet).toHaveBeenCalledWith({
      uids: new Set(['user-1', 'user-2']),
    });
    expect(result).toEqual([]);
  });

  it('should handle API errors gracefully without throwing', async () => {
    mockBulkGet.mockRejectedValue(new Error('User service unavailable'));

    await expect(getBulkAuthorNames(['user-1'])).resolves.toEqual([]);
  });

  it('should handle empty response from bulkGet', async () => {
    mockBulkGet.mockResolvedValue([]);

    const result = await getBulkAuthorNames(['user-1']);

    expect(result).toEqual([]);
  });
});
