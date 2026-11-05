/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockDisconnect = jest.fn();

jest.mock('./inspector', () => ({
  createSession: () => ({ post: jest.fn(), disconnect: mockDisconnect }),
}));

import { ProfileRunner } from './profile_runner';
import { ProfileStateError } from './profile_state_error';

const profile = { nodes: [], startTime: 0, endTime: 1 };

function createRunner() {
  const commands = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(profile),
  };
  return { commands, runner: new ProfileRunner('cpu', commands) };
}

describe('ProfileRunner', () => {
  beforeEach(() => {
    mockDisconnect.mockReset();
  });

  it('starts and stops a profile', async () => {
    const { commands, runner } = createRunner();

    await runner.start();
    expect(runner.isRunning()).toBe(true);
    expect(commands.start).toHaveBeenCalledTimes(1);

    const result = await runner.stop();
    expect(result.profile).toBe(profile);
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(runner.isRunning()).toBe(false);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('rejects starting a profile that is already running', async () => {
    const { runner } = createRunner();

    await runner.start();
    await expect(runner.start()).rejects.toThrow(ProfileStateError);
  });

  it('rejects concurrent starts', async () => {
    const { runner } = createRunner();

    const results = await Promise.allSettled([runner.start(), runner.start()]);
    expect(results.map(({ status }) => status)).toEqual(['fulfilled', 'rejected']);
  });

  it('rejects stopping when no profile is running', async () => {
    const { runner } = createRunner();
    await expect(runner.stop()).rejects.toThrow(ProfileStateError);
  });

  it('disconnects and is not running when start fails', async () => {
    const { commands, runner } = createRunner();
    commands.start.mockRejectedValueOnce(new Error('boom'));

    await expect(runner.start()).rejects.toThrow('boom');
    expect(runner.isRunning()).toBe(false);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects and is not running when stop fails', async () => {
    const { commands, runner } = createRunner();
    commands.stop.mockRejectedValueOnce(new Error('boom'));

    await runner.start();
    await expect(runner.stop()).rejects.toThrow('boom');
    expect(runner.isRunning()).toBe(false);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('captures a profile for a duration', async () => {
    const { commands, runner } = createRunner();

    await expect(runner.capture(0)).resolves.toMatchObject({ profile });
    expect(commands.start).toHaveBeenCalledTimes(1);
    expect(commands.stop).toHaveBeenCalledTimes(1);
    expect(runner.isRunning()).toBe(false);
  });

  it('aborts a running profile', async () => {
    const { commands, runner } = createRunner();

    await runner.start();
    runner.abort();
    expect(runner.isRunning()).toBe(false);
    expect(commands.stop).not.toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
