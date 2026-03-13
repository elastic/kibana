/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

import { captureCpuProfile } from './cpu_profile';

const inspector = jest.requireMock('../lib/inspector') as {
  createSession: () => { post: jest.Mock; disconnect: jest.Mock };
  _mockPost: jest.Mock;
  _mockDisconnect: jest.Mock;
};
const mockPost = inspector._mockPost;
const mockDisconnect = inspector._mockDisconnect;

describe('captureCpuProfile', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockDisconnect.mockReset();
  });

  it('returns profile from Profiler.stop after sampling for duration seconds', async () => {
    const mockProfile = { nodes: [], startTime: 0, endTime: 1000 };
    mockPost
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ profile: mockProfile })
      .mockResolvedValueOnce(undefined);

    await expect(captureCpuProfile(0)).resolves.toEqual(mockProfile);
    expect(mockPost).toHaveBeenCalledTimes(4);
    expect(mockPost).toHaveBeenNthCalledWith(1, 'Profiler.enable');
    expect(mockPost).toHaveBeenNthCalledWith(2, 'Profiler.start');
    expect(mockPost).toHaveBeenNthCalledWith(3, 'Profiler.stop');
    expect(mockPost).toHaveBeenNthCalledWith(4, 'Profiler.disable');
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('disconnects session and throws when Profiler.start fails', async () => {
    mockPost
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Profiler busy'));

    await expect(captureCpuProfile(0)).rejects.toThrow('Profiler start failed: Profiler busy');
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('disconnects session and throws when Profiler.stop fails', async () => {
    mockPost
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Profiler not started'));

    await expect(captureCpuProfile(0)).rejects.toThrow('Profiler not started');
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('throws when Profiler.stop returns null profile', async () => {
    mockPost
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ profile: null });

    await expect(captureCpuProfile(0)).rejects.toThrow('No profile captured');
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
