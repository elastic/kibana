/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  isPluginInitializationError,
  type PluginInitializationError,
  type PluginInitStatus,
} from '@kbn/core-deferred-init-common';
import { DeferredInitEngine, type PluginInitRunner } from './deferred_init_engine';
import {
  DEFERRED_INIT_BACKOFF_BASE_MS,
  DEFERRED_INIT_BACKOFF_FACTOR,
  DEFERRED_INIT_BACKOFF_MAX_MS,
  DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS,
  DEFERRED_INIT_SLOW_ATTEMPT_WARNING_MS,
} from './backoff';

const PLUGIN_ID = 'myPlugin';

type RunnerMock = jest.Mock<ReturnType<PluginInitRunner>, Parameters<PluginInitRunner>>;

/** A runner that resolves immediately unless a test overrides it. */
const createRunner = (): RunnerMock => jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

const noop = () => {};

/** Full-jitter delay scheduled after the n-th consecutive failure when `Math.random()` returns 1. */
const maxCooldownMs = (failedAttempts: number): number =>
  Math.min(
    DEFERRED_INIT_BACKOFF_BASE_MS * DEFERRED_INIT_BACKOFF_FACTOR ** (failedAttempts - 1),
    DEFERRED_INIT_BACKOFF_MAX_MS
  );

/** Awaits a rejection and returns it as the engine's public error, failing the test otherwise. */
const expectInitError = async (promise: Promise<void>): Promise<PluginInitializationError> => {
  const error: unknown = await promise.then(
    () => {
      throw new Error('expected the promise to reject');
    },
    (reason: unknown) => reason
  );
  if (!isPluginInitializationError(error)) {
    throw new Error(`expected a PluginInitializationError, got ${String(error)}`);
  }
  return error;
};

describe('DeferredInitEngine', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let engine: DeferredInitEngine;

  const attach = (runner: RunnerMock = createRunner()): RunnerMock => {
    engine.register(PLUGIN_ID);
    engine.setRunner(PLUGIN_ID, runner);
    return runner;
  };

  /** Drives `count` consecutive failures through `initialize()`, which never waits out a cooldown. */
  const failTimes = async (count: number): Promise<void> => {
    for (let i = 0; i < count; i++) {
      await engine.initialize(PLUGIN_ID).catch(noop);
    }
  };

  beforeEach(() => {
    jest.useFakeTimers();
    logger = loggingSystemMock.createLogger();
    engine = new DeferredInitEngine(logger);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('lifecycle guard', () => {
    it.each(['setup', 'start'] as const)(
      'rejects initialize() and waitUntilAvailable() during the %s lifecycle without invoking the runner',
      async (phase) => {
        const runner = attach();
        engine.beginLifecycle(phase);

        await expect(engine.initialize(PLUGIN_ID)).rejects.toThrow(
          `during the plugin ${phase} lifecycle`
        );
        await expect(engine.waitUntilAvailable(PLUGIN_ID)).rejects.toThrow(
          `during the plugin ${phase} lifecycle`
        );
        expect(runner).not.toHaveBeenCalled();
        expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'idle', attempts: 0 });
      }
    );

    it('rejects with a plain Error instead of throwing synchronously', async () => {
      attach();
      engine.beginLifecycle('start');

      const calls: Array<Promise<void>> = [];
      expect(() => calls.push(engine.waitUntilAvailable(PLUGIN_ID))).not.toThrow();
      expect(() => calls.push(engine.initialize(PLUGIN_ID))).not.toThrow();

      for (const call of calls) {
        await expect(call).rejects.toThrow(
          `Cannot wait for plugin "${PLUGIN_ID}" to initialize during the plugin start lifecycle: ` +
            `it would block boot. Call initialize() from a route handler, a task runner, or a ` +
            `function returned from start() that runs after boot.`
        );
        const error: unknown = await call.catch((reason: unknown) => reason);
        expect(isPluginInitializationError(error)).toBe(false);
      }
    });

    it('resolves again once endLifecycle() has been called', async () => {
      const runner = attach();
      engine.beginLifecycle('start');
      engine.endLifecycle();

      await expect(engine.initialize(PLUGIN_ID)).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
    });

    it('does not block ensureInitialized(), which never waits', async () => {
      const runner = attach();
      engine.beginLifecycle('start');

      expect(engine.ensureInitialized(PLUGIN_ID)).toBe('initializing');
      await jest.advanceTimersByTimeAsync(0);
      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
    });
  });

  describe('initialize()', () => {
    it('resolves without calling the runner again once available', async () => {
      const runner = attach();
      await engine.initialize(PLUGIN_ID);

      await expect(engine.initialize(PLUGIN_ID)).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(1);
    });

    it('joins an attempt that is already in flight', async () => {
      const attempt = Promise.withResolvers<void>();
      const runner = attach(createRunner().mockReturnValue(attempt.promise));

      const first = engine.initialize(PLUGIN_ID);
      const second = engine.initialize(PLUGIN_ID);
      await jest.advanceTimersByTimeAsync(0);
      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'initializing', attempts: 0 });

      attempt.resolve();
      await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
      expect(runner).toHaveBeenCalledTimes(1);
    });

    it('kicks an idle plugin and resolves once the attempt succeeds', async () => {
      const runner = attach();

      await expect(engine.initialize(PLUGIN_ID)).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
    });

    it('kicks a failed plugin immediately, cancelling the pending background retry', async () => {
      const runner = attach(createRunner().mockRejectedValueOnce(new Error('boom')));
      await engine.initialize(PLUGIN_ID).catch(noop);
      expect(engine.getStatus(PLUGIN_ID)).toMatchObject({ state: 'failed', attempts: 1 });
      expect(jest.getTimerCount()).toBe(1);

      // No timers advance: a plugin asking for itself does not wait out the backoff.
      await expect(engine.initialize(PLUGIN_ID)).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(2);
      expect(jest.getTimerCount()).toBe(0);

      // The cancelled cooldown never fires a third attempt.
      await jest.advanceTimersByTimeAsync(DEFERRED_INIT_BACKOFF_MAX_MS);
      expect(runner).toHaveBeenCalledTimes(2);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
    });

    it('rejects with a PluginInitializationError carrying the cause and status when the attempt fails', async () => {
      const boom = new Error('boom');
      attach(createRunner().mockRejectedValue(boom));

      const error = await expectInitError(engine.initialize(PLUGIN_ID));
      expect(error.pluginId).toBe(PLUGIN_ID);
      expect(error.cause).toBe(boom);
      expect(error.status).toBe('failed');
      expect(error.retriable).toBe(true);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({
        state: 'failed',
        attempts: 1,
        lastError: boom,
      });
    });

    it('rejects as non-retriable when no runner is attached', async () => {
      engine.register(PLUGIN_ID);

      const error = await expectInitError(engine.initialize(PLUGIN_ID));
      expect(error.retriable).toBe(false);
      expect(error.status).toBe('idle');
      expect(error.message).toBe(
        `Plugin "${PLUGIN_ID}" cannot be initialized: it has not started on this Kibana instance ` +
          `yet, or it is disabled or has no server side.`
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `Plugin "${PLUGIN_ID}" was asked to initialize before its start() ran on this instance; staying idle.`
      );
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'idle', attempts: 0 });
    });
  });

  describe('waitUntilAvailable()', () => {
    it('waits out the pending cooldown, then joins the retry it kicks', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      const runner = attach(createRunner().mockRejectedValueOnce(new Error('boom')));
      await engine.initialize(PLUGIN_ID).catch(noop);

      const wait = engine.waitUntilAvailable(PLUGIN_ID);
      await jest.advanceTimersByTimeAsync(maxCooldownMs(1) - 1);
      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getStatus(PLUGIN_ID)).toMatchObject({ state: 'failed', attempts: 1 });

      await jest.advanceTimersByTimeAsync(1);
      expect(runner).toHaveBeenCalledTimes(2);
      await expect(wait).resolves.toBeUndefined();
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
    });

    it('kicks immediately once background retries are exhausted', async () => {
      const runner = attach(createRunner().mockRejectedValue(new Error('boom')));
      await failTimes(DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS);
      expect(jest.getTimerCount()).toBe(0);
      runner.mockResolvedValue(undefined);

      const wait = engine.waitUntilAvailable(PLUGIN_ID);
      expect(engine.getStatus(PLUGIN_ID)).toMatchObject({
        state: 'initializing',
        attempts: DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS,
      });
      await expect(wait).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS + 1);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
    });

    it('joins the attempt a self initialize() starts while it is parked on the cooldown', async () => {
      const runner = attach(createRunner().mockRejectedValueOnce(new Error('boom')));
      await engine.initialize(PLUGIN_ID).catch(noop);

      const dependent = engine.waitUntilAvailable(PLUGIN_ID);
      const attempt = Promise.withResolvers<void>();
      runner.mockReturnValueOnce(attempt.promise);
      const self = engine.initialize(PLUGIN_ID);
      await jest.advanceTimersByTimeAsync(0);
      expect(runner).toHaveBeenCalledTimes(2);

      attempt.resolve();
      await expect(Promise.all([dependent, self])).resolves.toEqual([undefined, undefined]);
      expect(runner).toHaveBeenCalledTimes(2);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('shares one in-flight attempt across concurrent callers', async () => {
      const attempt = Promise.withResolvers<void>();
      const runner = attach(createRunner().mockReturnValue(attempt.promise));

      const waits = [
        engine.waitUntilAvailable(PLUGIN_ID),
        engine.waitUntilAvailable(PLUGIN_ID),
        engine.initialize(PLUGIN_ID),
      ];
      await jest.advanceTimersByTimeAsync(0);
      attempt.resolve();

      await expect(Promise.all(waits)).resolves.toEqual([undefined, undefined, undefined]);
      expect(runner).toHaveBeenCalledTimes(1);
    });

    it('observes exactly one attempt: rejects when the retry it waited for fails too', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      const first = new Error('first');
      const second = new Error('second');
      attach(createRunner().mockRejectedValueOnce(first).mockRejectedValueOnce(second));

      const firstError = await expectInitError(engine.waitUntilAvailable(PLUGIN_ID));
      expect(firstError.cause).toBe(first);

      const pending = expectInitError(engine.waitUntilAvailable(PLUGIN_ID));
      await jest.advanceTimersByTimeAsync(maxCooldownMs(1));
      const secondError = await pending;
      expect(secondError.cause).toBe(second);
      expect(secondError.status).toBe('failed');
      expect(engine.getStatus(PLUGIN_ID)).toEqual({
        state: 'failed',
        attempts: 2,
        lastError: second,
      });
    });

    it('rejects as non-retriable when no runner is attached', async () => {
      engine.register(PLUGIN_ID);

      const error = await expectInitError(engine.waitUntilAvailable(PLUGIN_ID));
      expect(error.retriable).toBe(false);
      expect(error.status).toBe('idle');
    });
  });

  describe('ensureInitialized()', () => {
    it('returns idle for an unknown plugin id without creating a record', () => {
      expect(engine.ensureInitialized('unknown')).toBe('idle');
      // Had a record been created, this second call would find it runner-less and warn.
      expect(engine.ensureInitialized('unknown')).toBe('idle');
      expect(logger.warn).not.toHaveBeenCalled();
      expect(engine.getStatus('unknown')).toEqual({ state: 'idle', attempts: 0 });
    });

    it('kicks an idle plugin and returns initializing without waiting', async () => {
      const runner = attach();

      expect(engine.ensureInitialized(PLUGIN_ID)).toBe('initializing');
      await jest.advanceTimersByTimeAsync(0);
      expect(runner).toHaveBeenCalledTimes(1);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
    });

    it('leaves a failed plugin alone while a background retry is scheduled', async () => {
      const runner = attach(createRunner().mockRejectedValueOnce(new Error('boom')));
      await engine.initialize(PLUGIN_ID).catch(noop);

      expect(engine.ensureInitialized(PLUGIN_ID)).toBe('failed');
      await jest.advanceTimersByTimeAsync(0);
      expect(runner).toHaveBeenCalledTimes(1);
    });

    it('re-kicks a failed plugin once background retries are exhausted', async () => {
      const runner = attach(createRunner().mockRejectedValue(new Error('boom')));
      await failTimes(DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS);
      runner.mockResolvedValue(undefined);

      expect(engine.ensureInitialized(PLUGIN_ID)).toBe('initializing');
      await jest.advanceTimersByTimeAsync(0);
      expect(runner).toHaveBeenCalledTimes(DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS + 1);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
    });

    it('turns a synchronously throwing runner into a failed attempt instead of throwing', async () => {
      attach(
        jest.fn<Promise<void>, []>(() => {
          throw new Error('sync boom');
        })
      );

      expect(engine.ensureInitialized(PLUGIN_ID)).toBe('initializing');
      await jest.advanceTimersByTimeAsync(0);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({
        state: 'failed',
        attempts: 1,
        lastError: new Error('sync boom'),
      });
    });
  });

  describe('status', () => {
    it('getStatus() and status$ never invoke the runner, in any state', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      const runner = attach(
        createRunner().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined)
      );
      const read = () => {
        engine.getStatus(PLUGIN_ID);
        engine.status$(PLUGIN_ID).subscribe().unsubscribe();
      };

      read(); // idle
      expect(runner).not.toHaveBeenCalled();

      const firstAttempt = engine.initialize(PLUGIN_ID).catch(noop);
      read(); // initializing
      await firstAttempt;
      expect(engine.getStatus(PLUGIN_ID).state).toBe('failed');
      read(); // failed, with the background retry still scheduled
      await jest.advanceTimersByTimeAsync(0);
      expect(runner).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(DEFERRED_INIT_BACKOFF_MAX_MS);
      expect(engine.getStatus(PLUGIN_ID).state).toBe('available');
      read(); // available
      await jest.advanceTimersByTimeAsync(0);
      expect(runner).toHaveBeenCalledTimes(2);
    });

    it('getStatus() and status$ never invoke the runner once background retries are exhausted', async () => {
      const runner = attach(createRunner().mockRejectedValue(new Error('boom')));
      await failTimes(DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS);
      expect(jest.getTimerCount()).toBe(0);

      engine.getStatus(PLUGIN_ID);
      engine.status$(PLUGIN_ID).subscribe().unsubscribe();
      await jest.advanceTimersByTimeAsync(0);

      expect(runner).toHaveBeenCalledTimes(DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS);
    });

    it('keeps emissions ordered for every subscriber when one re-kicks synchronously on failed', async () => {
      const runner = attach(
        createRunner().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined)
      );
      // An early subscriber that retries from inside the `failed` emission itself.
      engine.status$(PLUGIN_ID).subscribe((status) => {
        if (status.state === 'failed') {
          engine.initialize(PLUGIN_ID).catch(noop);
        }
      });
      const seen: string[] = [];
      engine
        .status$(PLUGIN_ID)
        .subscribe((status) => seen.push(`${status.state}:${status.attempts}`));

      await engine.initialize(PLUGIN_ID).catch(noop);
      await jest.advanceTimersByTimeAsync(0);

      expect(seen).toEqual([
        'idle:0',
        'initializing:0',
        'failed:1',
        'initializing:1',
        'available:0',
      ]);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
      expect(runner).toHaveBeenCalledTimes(2);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('getStatus() reports idle for an unknown plugin id without creating a record', () => {
      expect(engine.getStatus('unknown')).toEqual({ state: 'idle', attempts: 0 });
      expect(engine.ensureInitialized('unknown')).toBe('idle');
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('status$ may create an idle record but never kicks', () => {
      const seen: PluginInitStatus[] = [];
      engine.status$('other').subscribe((status) => seen.push(status));
      expect(seen).toEqual([{ state: 'idle', attempts: 0 }]);

      // The record now exists: a kick finds it runner-less and warns, which status$ never did.
      expect(engine.ensureInitialized('other')).toBe('idle');
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('emits the full sequence across a failure and the retry that succeeds', async () => {
      const boom = new Error('boom');
      attach(createRunner().mockRejectedValueOnce(boom));
      const seen: PluginInitStatus[] = [];
      engine.status$(PLUGIN_ID).subscribe((status) => seen.push(status));

      await engine.initialize(PLUGIN_ID).catch(noop);
      await engine.initialize(PLUGIN_ID);

      expect(seen).toEqual([
        { state: 'idle', attempts: 0 },
        { state: 'initializing', attempts: 0 },
        { state: 'failed', attempts: 1, lastError: boom },
        { state: 'initializing', attempts: 1, lastError: boom },
        { state: 'available', attempts: 0 },
      ]);
      expect(seen[2].lastError).toBe(boom);
      expect(seen[3].lastError).toBe(boom);
      expect(seen[1]).not.toHaveProperty('lastError');
      expect(seen[4]).not.toHaveProperty('lastError');
    });

    it('replays the current status to late subscribers', async () => {
      attach();
      await engine.initialize(PLUGIN_ID);

      const seen: PluginInitStatus[] = [];
      engine.status$(PLUGIN_ID).subscribe((status) => seen.push(status));
      expect(seen).toEqual([{ state: 'available', attempts: 0 }]);
    });

    it('wraps a non-Error rejection reason in an Error', async () => {
      attach(createRunner().mockRejectedValue('string reason'));

      const error = await expectInitError(engine.initialize(PLUGIN_ID));
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.cause).toEqual(new Error('string reason'));
      expect(engine.getStatus(PLUGIN_ID).lastError).toBeInstanceOf(Error);
    });

    it('markAvailable() emits available with no attempts, after which initialize() resolves at once', async () => {
      const seen: PluginInitStatus[] = [];
      engine.status$(PLUGIN_ID).subscribe((status) => seen.push(status));
      engine.markAvailable(PLUGIN_ID);

      expect(seen).toEqual([
        { state: 'idle', attempts: 0 },
        { state: 'available', attempts: 0 },
      ]);
      await expect(engine.initialize(PLUGIN_ID)).resolves.toBeUndefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('backoff', () => {
    it('schedules a full-jitter cooldown bounded by the exponential curve', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      const runner = attach(createRunner().mockRejectedValue(new Error('boom')));

      await failTimes(1);
      expect(logger.error).toHaveBeenLastCalledWith(
        `Plugin "${PLUGIN_ID}" initialize() failed (attempt 1): boom. Retrying in 1s.`
      );
      await jest.advanceTimersByTimeAsync(maxCooldownMs(1) - 1);
      expect(runner).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      expect(runner).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenLastCalledWith(
        `Plugin "${PLUGIN_ID}" initialize() failed (attempt 2): boom. Retrying in 2s.`
      );
    });

    it('caps the cooldown at the ceiling once the curve saturates', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      const runner = attach(createRunner().mockRejectedValue(new Error('boom')));
      const saturatedAttempt = 10;
      expect(maxCooldownMs(saturatedAttempt)).toBe(DEFERRED_INIT_BACKOFF_MAX_MS);

      await failTimes(saturatedAttempt);
      expect(logger.error).toHaveBeenLastCalledWith(
        `Plugin "${PLUGIN_ID}" initialize() failed (attempt ${saturatedAttempt}): boom. Retrying in 300s.`
      );
      await jest.advanceTimersByTimeAsync(DEFERRED_INIT_BACKOFF_MAX_MS - 1);
      expect(runner).toHaveBeenCalledTimes(saturatedAttempt);
      await jest.advanceTimersByTimeAsync(1);
      expect(runner).toHaveBeenCalledTimes(saturatedAttempt + 1);
    });

    it('jitters down to an immediate retry when Math.random() returns 0', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const runner = attach(createRunner().mockRejectedValueOnce(new Error('boom')));

      await engine.initialize(PLUGIN_ID).catch(noop);
      expect(logger.error).toHaveBeenLastCalledWith(expect.stringContaining('Retrying in 0s.'));
      await jest.advanceTimersByTimeAsync(0);
      expect(runner).toHaveBeenCalledTimes(2);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
    });

    it('stops scheduling timers at the 25th consecutive failure and keeps counting on-demand attempts', async () => {
      const runner = attach(createRunner().mockRejectedValue(new Error('boom')));
      const max = DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS;

      await failTimes(max - 1);
      expect(engine.getStatus(PLUGIN_ID)).toMatchObject({ state: 'failed', attempts: max - 1 });
      expect(jest.getTimerCount()).toBe(1);
      expect(logger.error).toHaveBeenLastCalledWith(expect.stringMatching(/Retrying in \d+s\.$/));

      await failTimes(1);
      expect(engine.getStatus(PLUGIN_ID)).toMatchObject({ state: 'failed', attempts: max });
      expect(jest.getTimerCount()).toBe(0);
      expect(logger.error).toHaveBeenLastCalledWith(
        `Plugin "${PLUGIN_ID}" initialize() failed (attempt ${max}): boom. No more background ` +
          `retries; the next request or initialize() call will try again.`
      );
      await jest.advanceTimersByTimeAsync(DEFERRED_INIT_BACKOFF_MAX_MS * 10);
      expect(runner).toHaveBeenCalledTimes(max);

      expect(engine.ensureInitialized(PLUGIN_ID)).toBe('initializing');
      await jest.advanceTimersByTimeAsync(0);
      expect(engine.getStatus(PLUGIN_ID)).toMatchObject({ state: 'failed', attempts: max + 1 });
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('slow attempt warning', () => {
    it('warns once when an attempt is still running after the threshold', async () => {
      attach(createRunner().mockReturnValue(new Promise<void>(noop)));
      engine.ensureInitialized(PLUGIN_ID);

      await jest.advanceTimersByTimeAsync(DEFERRED_INIT_SLOW_ATTEMPT_WARNING_MS - 1);
      expect(logger.warn).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Plugin "${PLUGIN_ID}" initialize() has been running for 10s and has not finished. ` +
          `Its routes and apps stay unavailable until it does.`
      );

      await jest.advanceTimersByTimeAsync(DEFERRED_INIT_BACKOFF_MAX_MS);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'initializing', attempts: 0 });
    });

    it('does not warn for an attempt that settles before the threshold', async () => {
      attach(
        createRunner().mockImplementation(
          () =>
            new Promise<void>((resolve) => {
              setTimeout(() => resolve(), 9_000);
            })
        )
      );
      engine.ensureInitialized(PLUGIN_ID);

      await jest.advanceTimersByTimeAsync(9_000);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
      expect(logger.info).toHaveBeenCalledWith(
        `Plugin "${PLUGIN_ID}" initialized in 9000ms; its routes and apps are now served.`
      );

      await jest.advanceTimersByTimeAsync(DEFERRED_INIT_SLOW_ATTEMPT_WARNING_MS);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('logs the first attempt, the retry and the success', async () => {
      attach(createRunner().mockRejectedValueOnce(new Error('boom')));

      await engine.initialize(PLUGIN_ID).catch(noop);
      await engine.initialize(PLUGIN_ID);

      expect(logger.info.mock.calls.map(([message]) => message)).toEqual([
        `Plugin "${PLUGIN_ID}": running initialize().`,
        `Plugin "${PLUGIN_ID}": retrying initialize() (1 failed attempt(s) so far).`,
        `Plugin "${PLUGIN_ID}" initialized in 0ms; its routes and apps are now served.`,
      ]);
    });
  });

  describe('per-instance state', () => {
    it('runs the runner on every engine instance', async () => {
      const other = new DeferredInitEngine(loggingSystemMock.createLogger());
      const runner = attach();
      const otherRunner = createRunner();
      other.register(PLUGIN_ID);
      other.setRunner(PLUGIN_ID, otherRunner);

      await engine.initialize(PLUGIN_ID);
      expect(other.getStatus(PLUGIN_ID)).toEqual({ state: 'idle', attempts: 0 });
      await other.initialize(PLUGIN_ID);

      expect(runner).toHaveBeenCalledTimes(1);
      expect(otherRunner).toHaveBeenCalledTimes(1);
      expect(engine.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
      expect(other.getStatus(PLUGIN_ID)).toEqual({ state: 'available', attempts: 0 });
    });
  });
});
