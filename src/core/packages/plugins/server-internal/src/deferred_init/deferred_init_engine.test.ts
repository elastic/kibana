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
import { DeferredInitEngine } from './deferred_init_engine';

const PLUGIN_ID = 'myPlugin';

const createCtx = (): LazyInitContext => ({
  elasticsearch: { client: {} as never },
  savedObjects: {} as never,
  logger: loggingSystemMock.create().get(),
});

/** A promise a test can hold open, to keep a run in flight while asserting on the engine. */
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('DeferredInitEngine', () => {
  let engine: DeferredInitEngine;

  beforeEach(() => {
    engine = new DeferredInitEngine(loggingSystemMock.create().get());
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

      engine.beginStartCycle();
      engine.endStartCycle();

      await expect(engine.waitUntilAvailable(PLUGIN_ID)).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getState(PLUGIN_ID)).toBe('available');
    });
  });

  describe('waitUntilAvailable', () => {
    it('resolves immediately if already available', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());

      await engine.trigger(PLUGIN_ID);
      expect(engine.getState(PLUGIN_ID)).toBe('available');

      await expect(engine.waitUntilAvailable(PLUGIN_ID)).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(1);
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

      await expect(engine.waitUntilAvailable(PLUGIN_ID)).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getState(PLUGIN_ID)).toBe('available');
    });

    it('rejects with a DeferredInitializationError (cause = last error) on failure', async () => {
      const runError = new Error('boom');
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, jest.fn().mockRejectedValue(runError), createCtx());

      const error = await engine.waitUntilAvailable(PLUGIN_ID).catch((e) => e);
      expect(isDeferredInitializationError(error)).toBe(true);
      expect(error.pluginId).toBe(PLUGIN_ID);
      expect(error.cause).toBe(runError);
      // A transient failure of the runner itself: worth retrying later.
      expect(error.retriable).toBe(true);
      expect(engine.getState(PLUGIN_ID)).toBe('failed');
    });

    it('shares a single in-flight run across concurrent callers', async () => {
      const run = deferred();
      const runner = jest.fn().mockReturnValue(run.promise);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());

      const first = engine.waitUntilAvailable(PLUGIN_ID);
      const second = engine.waitUntilAvailable(PLUGIN_ID);
      run.resolve();

      await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
      expect(runner).toHaveBeenCalledTimes(1);
    });
  });

  describe('per-instance execution', () => {
    it('runs the plugin runner on every engine instance (no shared cluster state)', async () => {
      const runnerA = jest.fn().mockResolvedValue(undefined);
      const engineA = new DeferredInitEngine(loggingSystemMock.create().get());
      engineA.register(PLUGIN_ID);
      engineA.setRunner(PLUGIN_ID, runnerA, createCtx());

      const runnerB = jest.fn().mockResolvedValue(undefined);
      const engineB = new DeferredInitEngine(loggingSystemMock.create().get());
      engineB.register(PLUGIN_ID);
      engineB.setRunner(PLUGIN_ID, runnerB, createCtx());

      await engineA.waitUntilAvailable(PLUGIN_ID);
      await engineB.waitUntilAvailable(PLUGIN_ID);

      // Each instance must do the work itself: `lazyInitialize` can establish instance-local
      // preconditions that a peer's run cannot satisfy.
      expect(runnerA).toHaveBeenCalledTimes(1);
      expect(runnerB).toHaveBeenCalledTimes(1);
      expect(engineA.getState(PLUGIN_ID)).toBe('available');
      expect(engineB.getState(PLUGIN_ID)).toBe('available');
    });

    it('runs the runner once per instance, not once per trigger', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());

      await engine.trigger(PLUGIN_ID);
      await engine.trigger(PLUGIN_ID);
      engine.ensureInitialized(PLUGIN_ID);

      expect(runner).toHaveBeenCalledTimes(1);
    });
  });

  describe('ensureInitialized', () => {
    it('returns idle without side effects for an unregistered plugin', () => {
      expect(engine.ensureInitialized('unknown')).toBe('idle');
    });

    it('kicks an idle plugin into initializing', () => {
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, jest.fn().mockResolvedValue(undefined), createCtx());

      expect(engine.ensureInitialized(PLUGIN_ID)).toBe('initializing');
    });

    it('does not re-kick a failed plugin, so the failure is actually observable', async () => {
      const runner = jest.fn().mockRejectedValue(new Error('boom'));
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner, createCtx());

      await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});
      expect(engine.getState(PLUGIN_ID)).toBe('failed');

      // A poll (or a gated route hit) reading the status right after the failure must see
      // `failed`, not silently re-kick and hide it behind `initializing`.
      expect(engine.ensureInitialized(PLUGIN_ID)).toBe('failed');
      expect(runner).toHaveBeenCalledTimes(1);
    });

    it('auto-kicks again once a cooldown flips a failed plugin back to idle', async () => {
      jest.useFakeTimers();
      try {
        const runner = jest
          .fn()
          .mockRejectedValueOnce(new Error('boom'))
          .mockResolvedValueOnce(undefined);
        engine.register(PLUGIN_ID);
        engine.setRunner(PLUGIN_ID, runner, createCtx());

        await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});
        expect(engine.getState(PLUGIN_ID)).toBe('failed');

        await jest.advanceTimersByTimeAsync(60_000);
        expect(engine.getState(PLUGIN_ID)).toBe('idle');

        expect(engine.ensureInitialized(PLUGIN_ID)).toBe('initializing');
        await jest.advanceTimersByTimeAsync(0);
        expect(runner).toHaveBeenCalledTimes(2);
        expect(engine.getState(PLUGIN_ID)).toBe('available');
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
        const runner = jest
          .fn()
          .mockRejectedValueOnce(new Error('boom'))
          .mockResolvedValueOnce(undefined);
        engine.register(PLUGIN_ID);
        engine.setRunner(PLUGIN_ID, runner, createCtx());

        await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});
        await jest.advanceTimersByTimeAsync(60_000);
        engine.ensureInitialized(PLUGIN_ID);

        expect(engine.getFailureDetails(PLUGIN_ID)).toBeUndefined();
      } finally {
        jest.useRealTimers();
      }
    });

    it('reports the error message and attempt count once failed', async () => {
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, jest.fn().mockRejectedValue(new Error('boom')), createCtx());

      await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});

      expect(engine.getFailureDetails(PLUGIN_ID)).toEqual({ message: 'boom', attempts: 1 });
    });

    it('increments across repeated failures and resets to 0 once a later attempt succeeds', async () => {
      jest.useFakeTimers();
      try {
        const runner = jest
          .fn()
          .mockRejectedValueOnce(new Error('first'))
          .mockRejectedValueOnce(new Error('second'))
          .mockResolvedValueOnce(undefined);
        engine.register(PLUGIN_ID);
        engine.setRunner(PLUGIN_ID, runner, createCtx());

        await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});
        expect(engine.getFailureDetails(PLUGIN_ID)).toEqual({ message: 'first', attempts: 1 });

        await jest.advanceTimersByTimeAsync(60_000);
        await engine.waitUntilAvailable(PLUGIN_ID).catch(() => {});
        expect(engine.getFailureDetails(PLUGIN_ID)).toEqual({ message: 'second', attempts: 2 });

        await jest.advanceTimersByTimeAsync(60_000);
        await engine.waitUntilAvailable(PLUGIN_ID);

        expect(engine.getState(PLUGIN_ID)).toBe('available');
        expect(engine.getFailureDetails(PLUGIN_ID)).toBeUndefined();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
