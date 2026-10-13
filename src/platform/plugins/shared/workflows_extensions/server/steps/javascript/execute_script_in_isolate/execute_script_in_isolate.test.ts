/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CONSOLE_LOG_MAX_MESSAGE_LENGTH } from './console_bridge_script';
import { executeScriptInIsolate } from './execute_script_in_isolate';
import {
  createScriptExecutionTimeoutMessage,
  createScriptOutOfMemoryMessage,
} from './normalize_isolate_execution_error';
import type { ScriptLogger } from './script_logger';
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

  it('truncates console messages longer than CONSOLE_LOG_MAX_MESSAGE_LENGTH and appends [truncated]', async () => {
    const logger = createLogger();

    await executeScriptInIsolate({
      script: `console.log('x'.repeat(${CONSOLE_LOG_MAX_MESSAGE_LENGTH + 100})); return true;`,
      logger,
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    const logged = (logger.info as jest.Mock).mock.calls[0][0] as string;
    expect(logged).toHaveLength(CONSOLE_LOG_MAX_MESSAGE_LENGTH + ' [truncated]'.length);
    expect(logged.endsWith(' [truncated]')).toBe(true);
  });

  it('does not truncate console messages at exactly CONSOLE_LOG_MAX_MESSAGE_LENGTH', async () => {
    const logger = createLogger();

    await executeScriptInIsolate({
      script: `console.log('x'.repeat(${CONSOLE_LOG_MAX_MESSAGE_LENGTH})); return true;`,
      logger,
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    const logged = (logger.info as jest.Mock).mock.calls[0][0] as string;
    expect(logged).toHaveLength(CONSOLE_LOG_MAX_MESSAGE_LENGTH);
    expect(logged.endsWith(' [truncated]')).toBe(false);
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

  it(
    'times out a console-busy loop (applySync boundary does not bypass the timeout)',
    async () => {
      await expect(
        executeScriptInIsolate({
          script: 'while (true) { console.log("x"); }',
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

  it('rejects instead of OOM-ing the host when the script returns N refs to a large string', async () => {
    // Regression: before the JSON-in-guest fix, `result: { copy: true }` on a value like
    // [s, s, ..., s] (N pointers to a shared 1 MB string) would allocate N × 1 MB in the
    // HOST because V8's value serializer clones each slot independently. The guest heap
    // stayed within its limit while the host grew without bound, eventually OOM-ing Kibana.
    //
    // Now JSON.stringify runs inside the isolate: 20 refs × 1 MB produces a ~20 MB JSON
    // string which exceeds the 8 MB guest heap, so the isolate OOMs cleanly and the host
    // never allocates the bulk. The test itself continuing after this call proves the host
    // process is still alive. (isolated-vm requires memoryLimit ≥ 8 MB.)
    const MEMORY_LIMIT_MB = 8;
    await expect(
      executeScriptInIsolate({
        script: `
          const s = 'z'.repeat(1024 * 1024);
          const a = new Array(20);
          for (let i = 0; i < 20; i++) a[i] = s;
          return a;
        `,
        logger: createLogger(),
        abortSignal: new AbortController().signal,
        memoryLimitMb: MEMORY_LIMIT_MB,
        executionTimeoutMs: CODE_EXECUTION_TIMEOUT_MS,
        maxConsoleLogCount: CODE_MAX_CONSOLE_LOG_COUNT,
      })
    ).rejects.toThrow(createScriptOutOfMemoryMessage(MEMORY_LIMIT_MB));
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

    it('serializes built-in object types such as Date to their JSON representation (ISO string)', async () => {
      const iso = '2026-01-02T03:04:05.000Z';
      const result = (await runScript(`return { when: new Date('${iso}') };`)) as {
        when: string;
      };

      // JSON.stringify converts Date to its ISO string; the host receives a string, not a Date.
      expect(result.when).toBe(iso);
    });

    it('strips __proto__ even when user code overrides Set.prototype.has before returning', async () => {
      const result = await runScript(`
        Set.prototype.has = () => false;
        return { ['__proto__']: { polluted: true }, safe: 1 };
      `);

      expect(result).toEqual({ safe: 1 });
    });

    it('strips __proto__ even when user code overrides WeakSet.prototype.has before returning', async () => {
      const result = await runScript(`
        WeakSet.prototype.has = () => false;
        WeakSet.prototype.add = () => {};
        WeakSet.prototype.delete = () => {};
        return { ['__proto__']: { polluted: true }, safe: 2 };
      `);

      expect(result).toEqual({ safe: 2 });
    });

    it('strips own __proto__ from a class instance (non-plain object)', async () => {
      // class instances bypass isPlainObject() but must still be scanned for
      // forbidden own keys because V8 structured-clone preserves own data
      // properties while stripping the prototype.
      const result = await runScript(`
        class Payload {
          constructor() {
            Object.defineProperty(this, '__proto__', { value: { polluted: true }, enumerable: true });
            this.safe = 3;
          }
        }
        return new Payload();
      `);

      expect((result as Record<string, unknown>).safe).toBe(3);
      expect(Object.prototype.toString.call(result)).not.toBe('[object Payload]');
      expect(JSON.stringify(result)).not.toContain('__proto__');
    });
  });

  describe('circular reference protection', () => {
    const runScript = (script: string): Promise<unknown> =>
      executeScriptInIsolate({
        script,
        logger: createLogger(),
        abortSignal: new AbortController().signal,
        ...defaultIsolateParams,
      });

    it('rejects an object that directly references itself', async () => {
      await expect(runScript(`const o = {}; o.self = o; return o;`)).rejects.toThrow(
        'Script returned a value containing a circular reference'
      );
    });

    it('rejects an array that contains itself', async () => {
      await expect(runScript(`const a = []; a.push(a); return a;`)).rejects.toThrow(
        'Script returned a value containing a circular reference'
      );
    });

    it('rejects a deeply nested circular reference', async () => {
      await expect(
        runScript(
          `const root = { child: { grandchild: {} } }; root.child.grandchild.back = root; return root;`
        )
      ).rejects.toThrow('Script returned a value containing a circular reference');
    });

    it('accepts a diamond-shaped graph (shared reference, no cycle)', async () => {
      const result = await runScript(`
        const shared = { value: 42 };
        return { a: shared, b: shared };
      `);

      expect(result).toEqual({ a: { value: 42 }, b: { value: 42 } });
    });
  });
});
