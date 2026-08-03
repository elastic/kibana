/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { LazyInitContext } from '@kbn/core-plugins-server';
import { isDeferredInitializationError } from '@kbn/core-deferred-init-common';
import { withLock, LockAcquisitionError } from '@kbn/lock-manager';
import { readDeferredInitState, writeDeferredInitOutcome } from './deferred_init_state';
import { DeferredInitEngine } from './deferred_init_engine';

jest.mock('@kbn/lock-manager', () => {
  const actual = jest.requireActual('@kbn/lock-manager');
  return {
    ...actual,
    withLock: jest.fn(),
  };
});

jest.mock('./deferred_init_state', () => ({
  readDeferredInitState: jest.fn(),
  writeDeferredInitOutcome: jest.fn(),
}));

const withLockMock = withLock as jest.Mock;
const readDeferredInitStateMock = readDeferredInitState as jest.Mock;
const writeDeferredInitOutcomeMock = writeDeferredInitOutcome as jest.Mock;

const PLUGIN_ID = 'myPlugin';

const createCtx = (): LazyInitContext => ({
  elasticsearch: { client: {} as never },
  savedObjects: {} as never,
  logger: loggingSystemMock.create().get(),
});

describe('DeferredInitEngine', () => {
  let engine: DeferredInitEngine;

  beforeEach(() => {
    engine = new DeferredInitEngine(loggingSystemMock.create().get(), '9.0.0');
    readDeferredInitStateMock.mockReset().mockResolvedValue(undefined);
    writeDeferredInitOutcomeMock.mockReset().mockResolvedValue(undefined);
    withLockMock.mockReset();
  });

  describe('isRegistered', () => {
    it('is false for an unknown plugin id', () => {
      expect(engine.isRegistered(PLUGIN_ID)).toBe(false);
    });

    it('is true once register() has been called', () => {
      engine.register(PLUGIN_ID);
      expect(engine.isRegistered(PLUGIN_ID)).toBe(true);
    });
  });

  describe('start-cycle guard', () => {
    it('throws (without running the runner) when waitUntilAvailable is called during the start cycle', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());
      withLockMock.mockImplementation((_opts, cb) => cb());

      engine.beginStartCycle();

      await expect(engine.waitUntilAvailable(PLUGIN_ID)).rejects.toThrow(
        /during the plugin start lifecycle/
      );
      // The point of the guard: it must not kick (or block on) the deferred work at boot.
      expect(runner).not.toHaveBeenCalled();
      expect(engine.getState(PLUGIN_ID)).toBe('idle');
    });

    it('resolves normally once the start cycle has ended', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());
      withLockMock.mockImplementation((_opts, cb) => cb());

      engine.beginStartCycle();
      engine.endStartCycle();

      await expect(engine.waitUntilAvailable(PLUGIN_ID)).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getState(PLUGIN_ID)).toBe('available');
    });
  });

  describe('waitUntilAvailable', () => {
    it('resolves immediately if already available', async () => {
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, jest.fn(), createCtx());
      withLockMock.mockImplementation((_opts, cb) => cb());

      await engine.trigger(PLUGIN_ID);
      expect(engine.getState(PLUGIN_ID)).toBe('available');

      await expect(engine.waitUntilAvailable(PLUGIN_ID)).resolves.toBeUndefined();
    });

    it('throws a non-retriable DeferredInitializationError if no runner is attached', async () => {
      engine.register(PLUGIN_ID);

      const error = await engine.waitUntilAvailable(PLUGIN_ID).catch((e) => e);
      expect(isDeferredInitializationError(error)).toBe(true);
      expect(error.pluginId).toBe(PLUGIN_ID);
      // A misconfiguration, not a transient failure: retrying can't make a runner appear.
      expect(error.retriable).toBe(false);
    });

    it('kicks an idle plugin and resolves once the run succeeds', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());
      withLockMock.mockImplementation((_opts, cb) => cb());

      await expect(engine.waitUntilAvailable(PLUGIN_ID)).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getState(PLUGIN_ID)).toBe('available');
    });

    it('rejects with a DeferredInitializationError (cause = last error) on terminal failure', async () => {
      const runError = new Error('boom');
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, jest.fn(), createCtx());
      withLockMock.mockRejectedValue(runError);

      const error = await engine.waitUntilAvailable(PLUGIN_ID).catch((e) => e);
      expect(isDeferredInitializationError(error)).toBe(true);
      expect(error.pluginId).toBe(PLUGIN_ID);
      expect(error.cause).toBe(runError);
      // A transient failure of the runner itself: worth retrying later.
      expect(error.retriable).toBe(true);
      expect(engine.getState(PLUGIN_ID)).toBe('failed');
    });

    it('retries past a lost cross-instance lock race, then succeeds', async () => {
      jest.useFakeTimers();
      try {
        const runner = jest.fn().mockResolvedValue(undefined);
        engine.register(PLUGIN_ID);
        engine.setRunner(PLUGIN_ID, runner, createCtx());

        // First attempt: another instance holds the lock.
        withLockMock.mockRejectedValueOnce(new LockAcquisitionError('lock held'));
        // Second attempt (after the cooldown flips back to idle): succeeds.
        withLockMock.mockImplementationOnce((_opts, cb) => cb());

        const waitPromise = engine.waitUntilAvailable(PLUGIN_ID);

        // Flush the first (losing) attempt and advance past its jittered cooldown, which
        // flips state `initializing` -> `idle` and lets the loop re-kick the runner.
        await jest.advanceTimersByTimeAsync(60_000);

        await expect(waitPromise).resolves.toBeUndefined();
        expect(withLockMock).toHaveBeenCalledTimes(2);
        expect(runner).toHaveBeenCalledTimes(1);
        expect(engine.getState(PLUGIN_ID)).toBe('available');
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('version-aware SO fast path', () => {
    it('skips the lock and runner when the stored state is available and version matches', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());
      readDeferredInitStateMock.mockResolvedValue({
        status: 'available',
        kibanaVersion: '9.0.0',
        updatedAt: new Date().toISOString(),
        attempts: 1,
      });

      await engine.waitUntilAvailable(PLUGIN_ID);

      expect(runner).not.toHaveBeenCalled();
      expect(withLockMock).not.toHaveBeenCalled();
      expect(engine.getState(PLUGIN_ID)).toBe('available');
    });

    it('falls through to the lock and runner when the stored version does not match (upgrade scenario)', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());
      readDeferredInitStateMock.mockResolvedValue({
        status: 'available',
        kibanaVersion: '8.99.0',
        updatedAt: new Date().toISOString(),
        attempts: 1,
      });
      withLockMock.mockImplementation((_opts, cb) => cb());

      await engine.waitUntilAvailable(PLUGIN_ID);

      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getState(PLUGIN_ID)).toBe('available');
    });

    it('falls through to the lock and runner when the stored state is failed regardless of version', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());
      readDeferredInitStateMock.mockResolvedValue({
        status: 'failed',
        kibanaVersion: '9.0.0',
        updatedAt: new Date().toISOString(),
        attempts: 1,
        lastError: 'previous run blew up',
      });
      withLockMock.mockImplementation((_opts, cb) => cb());

      await engine.waitUntilAvailable(PLUGIN_ID);

      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getState(PLUGIN_ID)).toBe('available');
    });
  });

  describe('ensureInitialized', () => {
    it('returns idle without side effects for an unregistered plugin', () => {
      expect(engine.ensureInitialized('unknown')).toBe('idle');
    });

    it('kicks an idle plugin into initializing', () => {
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, jest.fn().mockResolvedValue(undefined), createCtx());
      withLockMock.mockImplementation((_opts, cb) => cb());

      expect(engine.ensureInitialized(PLUGIN_ID)).toBe('initializing');
    });

    it('does not re-kick a failed plugin, so the failure is actually observable', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());
      withLockMock.mockRejectedValue(new Error('boom'));

      await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});
      expect(engine.getState(PLUGIN_ID)).toBe('failed');

      // A poll (or a gated route hit) reading the status right after the failure must see
      // `failed`, not silently re-kick and hide it behind `initializing`.
      expect(engine.ensureInitialized(PLUGIN_ID)).toBe('failed');
      expect(withLockMock).toHaveBeenCalledTimes(1);
    });

    it('auto-kicks again once a cooldown flips a failed plugin back to idle', async () => {
      jest.useFakeTimers();
      try {
        const runner = jest.fn().mockResolvedValue(undefined);
        engine.register(PLUGIN_ID);
        engine.setRunner(PLUGIN_ID, runner, createCtx());
        withLockMock.mockRejectedValueOnce(new Error('boom'));
        withLockMock.mockImplementationOnce((_opts, cb) => cb());

        await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});
        expect(engine.getState(PLUGIN_ID)).toBe('failed');

        await jest.advanceTimersByTimeAsync(60_000);
        expect(engine.getState(PLUGIN_ID)).toBe('idle');

        expect(engine.ensureInitialized(PLUGIN_ID)).toBe('initializing');
        await jest.advanceTimersByTimeAsync(0);
        expect(withLockMock).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('getFailureDetails', () => {
    it('is undefined for a plugin that has never failed', () => {
      engine.register(PLUGIN_ID);
      expect(engine.getFailureDetails(PLUGIN_ID)).toBeUndefined();
    });

    it('is undefined once state moves past failed (e.g. back to initializing)', async () => {
      jest.useFakeTimers();
      try {
        const runner = jest.fn().mockResolvedValue(undefined);
        engine.register(PLUGIN_ID);
        engine.setRunner(PLUGIN_ID, runner, createCtx());
        withLockMock.mockRejectedValueOnce(new Error('boom'));
        withLockMock.mockImplementationOnce((_opts, cb) => cb());

        await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});
        await jest.advanceTimersByTimeAsync(60_000);
        engine.ensureInitialized(PLUGIN_ID);

        expect(engine.getFailureDetails(PLUGIN_ID)).toBeUndefined();
      } finally {
        jest.useRealTimers();
      }
    });

    it('reports the error message and attempt count once failed', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());
      withLockMock.mockRejectedValue(new Error('boom'));

      await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});

      expect(engine.getFailureDetails(PLUGIN_ID)).toEqual({ message: 'boom', attempts: 1 });
    });

    it('increments across repeated failures and resets to 0 once a later attempt succeeds', async () => {
      jest.useFakeTimers();
      try {
        const runner = jest.fn().mockResolvedValue(undefined);
        engine.register(PLUGIN_ID);
        engine.setRunner(PLUGIN_ID, runner, createCtx());

        withLockMock.mockRejectedValueOnce(new Error('first'));
        await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});
        expect(engine.getFailureDetails(PLUGIN_ID)).toEqual({ message: 'first', attempts: 1 });

        await jest.advanceTimersByTimeAsync(60_000);
        withLockMock.mockRejectedValueOnce(new Error('second'));
        engine.ensureInitialized(PLUGIN_ID);
        await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});
        expect(engine.getFailureDetails(PLUGIN_ID)).toEqual({ message: 'second', attempts: 2 });

        await jest.advanceTimersByTimeAsync(60_000);
        withLockMock.mockImplementationOnce((_opts, cb) => cb());
        engine.ensureInitialized(PLUGIN_ID);
        await engine.waitUntilAvailable(PLUGIN_ID);

        expect(engine.getState(PLUGIN_ID)).toBe('available');
        expect(engine.getFailureDetails(PLUGIN_ID)).toBeUndefined();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
