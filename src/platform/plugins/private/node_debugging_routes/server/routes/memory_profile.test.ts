/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../lib/inspector', () => {
  const mockPost = jest.fn();
  const mockDisconnect = jest.fn();
  return {
    createSession: () => ({ post: mockPost, disconnect: mockDisconnect }),
    _mockPost: mockPost,
    _mockDisconnect: mockDisconnect,
  };
});

import { captureMemoryProfile } from './memory_profile';

const inspector = jest.requireMock('../lib/inspector') as {
  createSession: () => { post: jest.Mock; disconnect: jest.Mock };
  _mockPost: jest.Mock;
  _mockDisconnect: jest.Mock;
};
const mockPost = inspector._mockPost;
const mockDisconnect = inspector._mockDisconnect;

describe('captureMemoryProfile', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockDisconnect.mockReset();
  });

  it('returns profile from HeapProfiler.getSamplingProfile after sampling for duration seconds', async () => {
    const mockProfile = { head: {}, samples: [] };
    mockPost
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ profile: mockProfile })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    await expect(captureMemoryProfile(0)).resolves.toEqual(mockProfile);
    expect(mockPost).toHaveBeenCalledTimes(5);
    expect(mockPost).toHaveBeenNthCalledWith(1, 'HeapProfiler.enable');
    expect(mockPost).toHaveBeenNthCalledWith(2, 'HeapProfiler.startSampling');
    expect(mockPost).toHaveBeenNthCalledWith(3, 'HeapProfiler.getSamplingProfile');
    expect(mockPost).toHaveBeenNthCalledWith(4, 'HeapProfiler.stopSampling');
    expect(mockPost).toHaveBeenNthCalledWith(5, 'HeapProfiler.disable');
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('disconnects session and throws when HeapProfiler.startSampling fails', async () => {
    mockPost.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Already sampling'));

    await expect(captureMemoryProfile(0)).rejects.toThrow(
      'HeapProfiler startSampling failed: Already sampling'
    );
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('disconnects session and throws when HeapProfiler.getSamplingProfile fails', async () => {
    mockPost
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Not sampling'));

    await expect(captureMemoryProfile(0)).rejects.toThrow('Not sampling');
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('throws when HeapProfiler.getSamplingProfile returns null profile', async () => {
    mockPost
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ profile: null });

    await expect(captureMemoryProfile(0)).rejects.toThrow('No sampling profile captured');
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
