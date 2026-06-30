/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { executeScriptInIsolate, type ScriptLogger } from '.';
import {
  createScriptExecutionTimeoutMessage,
  createScriptOutOfMemoryMessage,
} from './normalize_isolate_execution_error';
import {
  CODE_EXECUTION_TIMEOUT_MS,
  CODE_MAX_CONSOLE_LOG_COUNT,
  CODE_MEMORY_LIMIT_MB,
} from '../../../../common/steps/javascript';

const defaultIsolateParams = {
  memoryLimitMb: CODE_MEMORY_LIMIT_MB,
  executionTimeoutMs: CODE_EXECUTION_TIMEOUT_MS,
  maxConsoleLogCount: CODE_MAX_CONSOLE_LOG_COUNT,
};

const createLogger = (): ScriptLogger & {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
} => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('executeScriptInIsolate', () => {
  it('executes script asynchronously and returns the result', async () => {
    const result = await executeScriptInIsolate({
      script: "return { greeting: 'Hello, World' };",
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toEqual({ greeting: 'Hello, World' });
  });

  it('routes console calls to the step logger', async () => {
    const logger = createLogger();

    await executeScriptInIsolate({
      script: `
        console.log('log message');
        console.info('info message');
        console.warn('warn message');
        console.error('error message');
        console.debug('debug message');
        return true;
      `,
      logger,
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(logger.info).toHaveBeenCalledWith('log message');
    expect(logger.info).toHaveBeenCalledWith('info message');
    expect(logger.warn).toHaveBeenCalledWith('warn message');
    expect(logger.error).toHaveBeenCalledWith('error message');
    expect(logger.debug).toHaveBeenCalledWith('debug message');
  });

  it('silently drops console logs after the cap is reached', async () => {
    const logger = createLogger();

    const result = await executeScriptInIsolate({
      script: `
        for (let i = 0; i < 150; i++) {
          console.log('message-' + i);
        }
        return 42;
      `,
      logger,
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toBe(42);
    expect(logger.info).toHaveBeenCalledTimes(CODE_MAX_CONSOLE_LOG_COUNT);
  });

  it('does not expose host data to user scripts', async () => {
    const result = await executeScriptInIsolate({
      script: 'return { context: typeof context, input: typeof input };',
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toEqual({ context: 'undefined', input: 'undefined' });
  });

  it('does not expose __logBridge__ to user scripts', async () => {
    const result = await executeScriptInIsolate({
      script: 'return typeof __logBridge__;',
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toBe('undefined');
  });

  it('rejects scripts that use await (synchronous code only)', async () => {
    await expect(
      executeScriptInIsolate({
        script: 'const value = await Promise.resolve(42); return value;',
        logger: createLogger(),
        abortSignal: new AbortController().signal,
        ...defaultIsolateParams,
      })
    ).rejects.toThrow(/await is only valid in async/i);
  });

  it('rejects scripts that return a Promise (synchronous code only)', async () => {
    await expect(
      executeScriptInIsolate({
        script: 'return Promise.resolve(42);',
        logger: createLogger(),
        abortSignal: new AbortController().signal,
        ...defaultIsolateParams,
      })
    ).rejects.toThrow();
  });

  it('does not let async side effects escape: microtasks never run before copy-out', async () => {
    // `Promise` exists in the isolate, but the script body runs synchronously and
    // the result is copied out before the microtask queue is flushed, so a value
    // set inside a `.then` callback can never be observed by the host.
    const result = await executeScriptInIsolate({
      script: `
        let captured = 'sync';
        Promise.resolve('async').then(() => { captured = 'async'; });
        return captured;
      `,
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toBe('sync');
  });

  it('returns primitive values from user scripts', async () => {
    const result = await executeScriptInIsolate({
      script: 'return 42;',
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toBe(42);
  });

  it('does not allow wrapper injection via concatenated script payloads', async () => {
    await expect(
      executeScriptInIsolate({
        script: '})(); return 1; (function(){',
        logger: createLogger(),
        abortSignal: new AbortController().signal,
        ...defaultIsolateParams,
      })
    ).rejects.toThrow();
  });

  it(
    'times out script execution after 5 seconds',
    async () => {
      await expect(
        executeScriptInIsolate({
          script: 'while (true) {}',
          logger: createLogger(),
          abortSignal: new AbortController().signal,
          ...defaultIsolateParams,
        })
      ).rejects.toThrow(createScriptExecutionTimeoutMessage(CODE_EXECUTION_TIMEOUT_MS));
    },
    CODE_EXECUTION_TIMEOUT_MS + 2_000
  );

  it('cancels execution when the abort signal fires', async () => {
    const abortController = new AbortController();

    const execution = executeScriptInIsolate({
      script: 'while (true) {}',
      logger: createLogger(),
      abortSignal: abortController.signal,
      ...defaultIsolateParams,
    });

    setTimeout(() => {
      abortController.abort();
    }, 100);

    await expect(execution).rejects.toThrow('Step execution was cancelled');
  });

  it('returns a user-friendly error when an ArrayBuffer allocation exceeds the memory limit', async () => {
    await expect(
      executeScriptInIsolate({
        script: 'new ArrayBuffer(100 * 1024 * 1024);',
        logger: createLogger(),
        abortSignal: new AbortController().signal,
        ...defaultIsolateParams,
      })
    ).rejects.toThrow(createScriptOutOfMemoryMessage(CODE_MEMORY_LIMIT_MB));
  });

  describe('prototype pollution prevention', () => {
    const runScript = (script: string): Promise<unknown> =>
      executeScriptInIsolate({
        script,
        logger: createLogger(),
        abortSignal: new AbortController().signal,
        ...defaultIsolateParams,
      });

    // Catch global pollution of the host realm regardless of which forbidden
    // key a test injects. Snapshot the descriptors before each test and assert
    // nothing new leaked onto Object.prototype afterwards.
    const protoKeys = ['polluted', 'isAdmin', 'injected'] as const;

    afterEach(() => {
      for (const key of protoKeys) {
        expect(({} as Record<string, unknown>)[key]).toBeUndefined();
        expect(Object.getOwnPropertyDescriptor(Object.prototype, key)).toBeUndefined();
      }
    });

    it('strips an own __proto__ key from the returned object', async () => {
      const result = await runScript(`return { ['__proto__']: { polluted: true }, safe: 1 };`);

      expect(result).toEqual({ safe: 1 });
      expect(JSON.stringify(result)).not.toContain('__proto__');
    });

    it('strips own constructor and prototype keys from the returned object', async () => {
      const result = await runScript(
        `return { constructor: { evil: true }, prototype: { evil: true }, safe: 2 };`
      );

      expect(result).toEqual({ safe: 2 });
    });

    it('strips forbidden keys nested deep in the returned object', async () => {
      const result = await runScript(
        `return { a: { b: { ['__proto__']: { isAdmin: true }, keep: 'value' } } };`
      );

      expect(result).toEqual({ a: { b: { keep: 'value' } } });
    });

    it('strips forbidden keys nested inside arrays', async () => {
      const result = await runScript(
        `return { items: [{ ['__proto__']: { polluted: true }, id: 1 }, { id: 2 }] };`
      );

      expect(result).toEqual({ items: [{ id: 1 }, { id: 2 }] });
    });

    it('strips forbidden keys reached via constructor.prototype chains', async () => {
      const result = await runScript(
        `return { constructor: { prototype: { injected: true } }, ok: true };`
      );

      expect(result).toEqual({ ok: true });
    });

    it('preserves arrays and ordinary nested structures untouched', async () => {
      const result = await runScript(`return { items: [1, 2, { ok: true }], nested: { a: 1 } };`);

      expect(result).toEqual({ items: [1, 2, { ok: true }], nested: { a: 1 } });
    });

    it('preserves a property whose value is the string "__proto__"', async () => {
      const result = await runScript(`return { label: '__proto__', count: 3 };`);

      expect(result).toEqual({ label: '__proto__', count: 3 });
    });

    it('preserves built-in object types such as Date (does not flatten to {})', async () => {
      const iso = '2026-01-02T03:04:05.000Z';
      const result = (await runScript(`return { when: new Date('${iso}') };`)) as {
        when: Date;
      };

      // The copied-out Date originates from the isolate realm, so cross-realm
      // `instanceof` is unreliable; assert on the structural tag and value.
      expect(Object.prototype.toString.call(result.when)).toBe('[object Date]');
      expect(result.when.toISOString()).toBe(iso);
    });
  });
});
