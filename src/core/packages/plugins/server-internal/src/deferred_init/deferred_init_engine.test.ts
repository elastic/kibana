/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, toArray, take } from 'rxjs';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { PluginInitStatus } from '@kbn/core-plugins-server';
import { DeferredInitEngine, SLOW_INITIALIZE_WARNING_MS } from './deferred_init_engine';

const createEngine = () => {
  const logger = loggingSystemMock.createLogger();
  return { engine: new DeferredInitEngine(logger), logger };
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('DeferredInitEngine', () => {
  // Fake `setTimeout` so the slow-run warning timers of runs that never settle do not outlive a test.
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['setImmediate'] }));
  afterEach(() => jest.useRealTimers());

  describe('status', () => {
    it('reports `idle` for an unknown plugin', () => {
      const { engine } = createEngine();
      expect(engine.getStatus('foo')).toBe('idle');
    });

    it('reports `available` for a plugin without initialize() once marked', async () => {
      const { engine } = createEngine();
      engine.markAvailable('foo');

      expect(engine.getStatus('foo')).toBe('available');
      expect(await firstValueFrom(engine.status$('foo'))).toBe('available');
    });

    it('goes through `initializing` to `available` on success', async () => {
      const { engine } = createEngine();
      const statuses = firstValueFrom(engine.status$('foo').pipe(take(3), toArray()));

      engine.startInitialization(new Map([['foo', jest.fn().mockResolvedValue(undefined)]]));
      await engine.initialize('foo');

      expect(await statuses).toEqual<PluginInitStatus[]>(['idle', 'initializing', 'available']);
    });

    it('goes through `initializing` to `failed` on failure', async () => {
      const { engine } = createEngine();
      const statuses = firstValueFrom(engine.status$('foo').pipe(take(3), toArray()));

      engine.startInitialization(
        new Map([['foo', jest.fn().mockRejectedValue(new Error('boom'))]])
      );
      await expect(engine.initialize('foo')).rejects.toThrow();

      expect(await statuses).toEqual<PluginInitStatus[]>(['idle', 'initializing', 'failed']);
    });
  });

  describe('#startInitialization', () => {
    it('runs every runner once, in the given order, without waiting for them', async () => {
      const { engine } = createEngine();
      const calls: string[] = [];
      const pending = new Promise<void>(() => {});
      const runner = (name: string) => () => {
        calls.push(name);
        return pending;
      };

      engine.startInitialization(
        new Map([
          ['foo', runner('foo')],
          ['bar', runner('bar')],
        ])
      );

      expect(engine.getStatus('foo')).toBe('initializing');
      expect(engine.getStatus('bar')).toBe('initializing');
      await flushPromises();
      expect(calls).toEqual(['foo', 'bar']);
    });

    it('turns a synchronous throw into a failed run', async () => {
      const { engine } = createEngine();
      engine.startInitialization(
        new Map([
          [
            'foo',
            () => {
              throw new Error('sync boom');
            },
          ],
        ])
      );

      await expect(engine.initialize('foo')).rejects.toThrow(
        'Plugin "foo" initialize() failed: sync boom'
      );
    });
  });

  describe('#initialize', () => {
    it('rejects before boot has completed', async () => {
      const { engine } = createEngine();
      engine.markAvailable('foo');

      await expect(engine.initialize('foo')).rejects.toThrow(
        'Cannot wait for plugin "foo" to initialize before every plugin has started'
      );
    });

    it('resolves for a plugin without initialize()', async () => {
      const { engine } = createEngine();
      engine.markAvailable('foo');
      engine.startInitialization(new Map());

      await expect(engine.initialize('foo')).resolves.toBeUndefined();
    });

    it('waits for the running initialize() and never runs it twice', async () => {
      const { engine } = createEngine();
      const { promise, resolve } = Promise.withResolvers<void>();
      const runner = jest.fn(() => promise);
      engine.startInitialization(new Map([['foo', runner]]));

      const first = engine.initialize('foo');
      const second = engine.initialize('foo');
      resolve();

      await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
      await expect(engine.initialize('foo')).resolves.toBeUndefined();
      expect(runner).toHaveBeenCalledTimes(1);
    });

    it('rejects with the plugin id and the cause when initialize() fails', async () => {
      const { engine } = createEngine();
      const cause = new Error('boom');
      engine.startInitialization(new Map([['foo', jest.fn().mockRejectedValue(cause)]]));

      const error = await engine.initialize('foo').catch((e: Error) => e);

      expect(error).toEqual(new Error('Plugin "foo" initialize() failed: boom'));
      expect((error as Error).cause).toBe(cause);
    });

    it('rejects for a plugin that has not started on this instance', async () => {
      const { engine } = createEngine();
      engine.startInitialization(new Map());

      await expect(engine.initialize('foo')).rejects.toThrow(
        'Plugin "foo" has not started on this Kibana instance.'
      );
    });
  });

  describe('#failure$', () => {
    it('emits the error of a failed initialize() that nobody awaits', async () => {
      const { engine } = createEngine();
      const failure = firstValueFrom(engine.failure$);

      engine.startInitialization(
        new Map([['foo', jest.fn().mockRejectedValue(new Error('boom'))]])
      );

      expect(await failure).toEqual(new Error('Plugin "foo" initialize() failed: boom'));
    });

    it('replays the failure to late subscribers', async () => {
      const { engine } = createEngine();
      engine.startInitialization(
        new Map([['foo', jest.fn().mockRejectedValue(new Error('boom'))]])
      );
      await flushPromises();

      expect(await firstValueFrom(engine.failure$)).toEqual(
        new Error('Plugin "foo" initialize() failed: boom')
      );
    });

    it('does not emit when initialize() succeeds', async () => {
      const { engine } = createEngine();
      const onFailure = jest.fn();
      engine.failure$.subscribe(onFailure);

      engine.startInitialization(new Map([['foo', jest.fn().mockResolvedValue(undefined)]]));
      await engine.initialize('foo');

      expect(onFailure).not.toHaveBeenCalled();
    });
  });

  describe('slow initialize() warning', () => {
    it('warns once initialize() has run longer than the threshold', () => {
      const { engine, logger } = createEngine();
      engine.startInitialization(new Map([['foo', () => new Promise<void>(() => {})]]));

      jest.advanceTimersByTime(SLOW_INITIALIZE_WARNING_MS - 1);
      expect(logger.warn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn.mock.calls[0][0]).toMatch(
        /^Plugin "foo" initialize\(\) has been running for \d+s and has not finished\.$/
      );
    });

    it('does not warn when initialize() settles before the threshold', async () => {
      const { engine, logger } = createEngine();
      engine.startInitialization(new Map([['foo', jest.fn().mockResolvedValue(undefined)]]));
      await engine.initialize('foo');

      jest.advanceTimersByTime(SLOW_INITIALIZE_WARNING_MS);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
