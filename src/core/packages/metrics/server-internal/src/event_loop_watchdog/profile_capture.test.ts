/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProfileCapture, type CpuProfile, type InspectorSession } from './profile_capture';
import { SAMPLING_INTERVAL_US } from './constants';

const profile: CpuProfile = {
  nodes: [{ id: 1, callFrame: { functionName: '(root)' } }],
  startTime: 0,
  endTime: 1000,
  samples: [1],
};

describe('ProfileCapture', () => {
  let session: jest.Mocked<InspectorSession>;

  beforeEach(() => {
    session = {
      connectToMainThread: jest.fn(),
      disconnect: jest.fn(),
      post: jest.fn(async (method: string) =>
        method === 'Profiler.stop' ? { profile } : {}
      ) as jest.Mocked<InspectorSession>['post'],
    };
  });

  it('connects to the main thread and starts the profiler in one round trip', async () => {
    const capture = new ProfileCapture(() => session);
    expect(session.connectToMainThread).toHaveBeenCalledTimes(1);
    await capture.start();
    expect(session.post.mock.calls).toEqual([
      ['Profiler.enable'],
      ['Profiler.setSamplingInterval', { interval: SAMPLING_INTERVAL_US }],
      ['Profiler.start'],
    ]);
  });

  it.each(['Profiler.enable', 'Profiler.setSamplingInterval', 'Profiler.start'])(
    'fails to start when %s fails',
    async (failing) => {
      session.post.mockImplementation(async (method: string) => {
        if (method === failing) {
          throw new Error(`${failing} failed`);
        }
        return {};
      });
      await expect(new ProfileCapture(() => session).start()).rejects.toThrow(`${failing} failed`);
    }
  );

  it('stops the profiler, returns the profile and ends the session', async () => {
    const capture = new ProfileCapture(() => session);
    await capture.start();
    await expect(capture.stop()).resolves.toBe(profile);
    expect(session.disconnect).toHaveBeenCalledTimes(1);
  });

  it('ends the session when the stop fails', async () => {
    session.post.mockRejectedValueOnce(new Error('stop failed'));
    const capture = new ProfileCapture(() => session);
    await expect(capture.stop()).rejects.toThrow('stop failed');
    expect(session.disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects once', () => {
    const capture = new ProfileCapture(() => session);
    capture.dispose();
    capture.dispose();
    expect(session.disconnect).toHaveBeenCalledTimes(1);
  });
});
