/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { HookHandlerRegistry } from './hook_handler_registry';
import { invokeHookInternal } from './invoke_hook_internal';
import { TriggerRegistry } from './trigger_registry';

const TRIGGER_ID = 'test.event';
const OUTPUT_SCHEMA = z.object({ value: z.string() }).passthrough();

const createMockLogger = (): jest.Mocked<Pick<Logger, 'warn' | 'error' | 'info' | 'debug'>> => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
});

const setupDeps = () => {
  const triggerRegistry = new TriggerRegistry();
  const hookHandlerRegistry = new HookHandlerRegistry();
  const sessionCapabilityCache = new Map<string, Record<string, unknown>>();
  const logger = createMockLogger();

  triggerRegistry.register({
    id: TRIGGER_ID,
    eventSchema: z.object({ value: z.string() }).passthrough(),
    sync: {
      outputSchema: OUTPUT_SCHEMA,
      maxTimeout: '100ms',
      failurePolicy: 'closed',
      chained: true,
    },
  });

  return {
    deps: {
      triggerRegistry,
      hookHandlerRegistry,
      sessionCapabilityCache,
      logger: logger as unknown as Logger,
    },
    hookHandlerRegistry,
    sessionCapabilityCache,
    logger,
  };
};

describe('invokeHookInternal', () => {
  describe('guards', () => {
    it('throws when trigger is not registered', async () => {
      const { deps } = setupDeps();
      await expect(invokeHookInternal(deps, 'unknown.trigger', {})).rejects.toThrow(
        'Trigger "unknown.trigger" is not registered'
      );
    });

    it('throws when trigger has no sync block', async () => {
      const { deps } = setupDeps();
      deps.triggerRegistry.register({
        id: 'async.only',
        eventSchema: z.object({}).passthrough(),
      });
      await expect(invokeHookInternal(deps, 'async.only', {})).rejects.toThrow(
        'does not have a sync block'
      );
    });
  });

  describe('pass_through', () => {
    it('returns pass_through with original payload when no handlers are registered', async () => {
      const { deps } = setupDeps();
      const payload = { value: 'hello' };

      const result = await invokeHookInternal(deps, TRIGGER_ID, payload);

      expect(result).toEqual({ status: 'pass_through', output: payload });
    });
  });

  describe('completed — single handler', () => {
    it('returns completed with handler output', async () => {
      const { deps, hookHandlerRegistry } = setupDeps();
      hookHandlerRegistry.register(TRIGGER_ID, async () => ({ value: 'modified' }));

      const result = await invokeHookInternal(deps, TRIGGER_ID, { value: 'original' });

      expect(result).toEqual({ status: 'completed', output: { value: 'modified' } });
    });
  });

  describe('chained mode', () => {
    it('passes each handler output as the next handler input', async () => {
      const { deps, hookHandlerRegistry } = setupDeps();
      const calls: Array<Record<string, unknown>> = [];

      hookHandlerRegistry.register(TRIGGER_ID, async (p) => {
        calls.push(p);
        return { value: 'step-1' };
      });
      hookHandlerRegistry.register(TRIGGER_ID, async (p) => {
        calls.push(p);
        return { value: 'step-2' };
      });

      const result = await invokeHookInternal(deps, TRIGGER_ID, { value: 'original' });

      expect(calls[0]).toEqual({ value: 'original' });
      expect(calls[1]).toEqual({ value: 'step-1' });
      expect(result).toEqual({ status: 'completed', output: { value: 'step-2' } });
    });
  });

  describe('non-chained mode', () => {
    const setupNonChained = () => {
      const triggerRegistry = new TriggerRegistry();
      const hookHandlerRegistry = new HookHandlerRegistry();
      const logger = createMockLogger();

      triggerRegistry.register({
        id: TRIGGER_ID,
        eventSchema: z.object({ value: z.string() }).passthrough(),
        sync: {
          outputSchema: OUTPUT_SCHEMA,
          maxTimeout: '100ms',
          failurePolicy: 'closed',
          chained: false,
        },
      });

      return {
        deps: {
          triggerRegistry,
          hookHandlerRegistry,
          sessionCapabilityCache: new Map<string, Record<string, unknown>>(),
          logger: logger as unknown as Logger,
        },
        hookHandlerRegistry,
      };
    };

    it('every handler receives the original payload', async () => {
      const { deps, hookHandlerRegistry } = setupNonChained();
      const receivedPayloads: Array<Record<string, unknown>> = [];

      hookHandlerRegistry.register(TRIGGER_ID, async (p) => {
        receivedPayloads.push(p);
        return { value: 'handler-1-output' };
      });
      hookHandlerRegistry.register(TRIGGER_ID, async (p) => {
        receivedPayloads.push(p);
        return { value: 'handler-2-output' };
      });

      await invokeHookInternal(deps, TRIGGER_ID, { value: 'original' });

      expect(receivedPayloads[0]).toEqual({ value: 'original' });
      expect(receivedPayloads[1]).toEqual({ value: 'original' });
    });

    it('returns the original payload as output, discarding handler return values', async () => {
      const { deps, hookHandlerRegistry } = setupNonChained();
      hookHandlerRegistry.register(TRIGGER_ID, async () => ({ value: 'ignored' }));

      const result = await invokeHookInternal(deps, TRIGGER_ID, { value: 'original' });

      expect(result).toEqual({ status: 'completed', output: { value: 'original' } });
    });
  });

  describe('failurePolicy: closed', () => {
    it('returns failed immediately when a handler throws', async () => {
      const { deps, hookHandlerRegistry } = setupDeps();
      hookHandlerRegistry.register(TRIGGER_ID, async () => {
        throw new Error('handler boom');
      });
      hookHandlerRegistry.register(TRIGGER_ID, jest.fn()); // should not be called

      const result = await invokeHookInternal(deps, TRIGGER_ID, { value: 'x' });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('handler boom');
    });

    it('returns the payload accumulated up to the point of failure', async () => {
      const { deps, hookHandlerRegistry } = setupDeps();
      hookHandlerRegistry.register(TRIGGER_ID, async () => ({ value: 'after-step-1' }));
      hookHandlerRegistry.register(TRIGGER_ID, async () => {
        throw new Error('step 2 fails');
      });

      const result = await invokeHookInternal(deps, TRIGGER_ID, { value: 'original' });

      expect(result.status).toBe('failed');
      expect(result.output).toEqual({ value: 'after-step-1' });
    });

    it('does not call subsequent handlers after a failure', async () => {
      const { deps, hookHandlerRegistry } = setupDeps();
      const laterHandler = jest.fn();
      hookHandlerRegistry.register(TRIGGER_ID, async () => {
        throw new Error('fail');
      });
      hookHandlerRegistry.register(TRIGGER_ID, laterHandler);

      await invokeHookInternal(deps, TRIGGER_ID, { value: 'x' });

      expect(laterHandler).not.toHaveBeenCalled();
    });
  });

  describe('failurePolicy: open', () => {
    const setupOpen = () => {
      const triggerRegistry = new TriggerRegistry();
      const hookHandlerRegistry = new HookHandlerRegistry();
      const logger = createMockLogger();

      triggerRegistry.register({
        id: TRIGGER_ID,
        eventSchema: z.object({ value: z.string() }).passthrough(),
        sync: {
          outputSchema: OUTPUT_SCHEMA,
          maxTimeout: '100ms',
          failurePolicy: 'open',
          chained: true,
        },
      });

      return {
        deps: {
          triggerRegistry,
          hookHandlerRegistry,
          sessionCapabilityCache: new Map<string, Record<string, unknown>>(),
          logger: logger as unknown as Logger,
        },
        hookHandlerRegistry,
        logger,
      };
    };

    it('logs a warning and continues to the next handler', async () => {
      const { deps, hookHandlerRegistry, logger } = setupOpen();
      hookHandlerRegistry.register(TRIGGER_ID, async () => {
        throw new Error('non-fatal');
      });
      hookHandlerRegistry.register(TRIGGER_ID, async () => ({ value: 'recovered' }));

      const result = await invokeHookInternal(deps, TRIGGER_ID, { value: 'x' });

      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ value: 'recovered' });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('non-fatal'));
    });
  });

  describe('timeout enforcement', () => {
    it('times out a stalled handler and applies failurePolicy (closed)', async () => {
      jest.useFakeTimers();
      const { deps, hookHandlerRegistry } = setupDeps();
      hookHandlerRegistry.register(
        TRIGGER_ID,
        () => new Promise<Record<string, unknown>>(() => {})
      );

      const invokePromise = invokeHookInternal(deps, TRIGGER_ID, { value: 'x' });
      jest.runAllTimers();
      const result = await invokePromise;

      jest.useRealTimers();

      expect(result.status).toBe('failed');
      expect(result.error).toContain('timed out after 100ms');
    });
  });

  describe('output schema validation', () => {
    it('fails (closed) when handler returns a value that does not match outputSchema', async () => {
      const { deps, hookHandlerRegistry } = setupDeps();
      // value must be a string; returning a number violates the schema
      hookHandlerRegistry.register(TRIGGER_ID, async () => ({ value: 42 as unknown as string }));

      const result = await invokeHookInternal(deps, TRIGGER_ID, { value: 'x' });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('failed schema validation');
    });

    it('passes extra fields through when outputSchema uses passthrough', async () => {
      const { deps, hookHandlerRegistry } = setupDeps();
      hookHandlerRegistry.register(TRIGGER_ID, async () => ({ value: 'ok', extra: 'field' }));

      const result = await invokeHookInternal(deps, TRIGGER_ID, { value: 'x' });

      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ value: 'ok', extra: 'field' });
    });
  });

  describe('sessionCapabilityCache', () => {
    it('stores capabilities under sessionId before handlers run', async () => {
      const { deps, hookHandlerRegistry, sessionCapabilityCache } = setupDeps();
      const capabilities = { token: 'abc' };
      let capturedDuringHandler: Record<string, unknown> | undefined;

      hookHandlerRegistry.register(TRIGGER_ID, async () => {
        capturedDuringHandler = sessionCapabilityCache.get('sess-1');
        return { value: 'ok' };
      });

      await invokeHookInternal(deps, TRIGGER_ID, { value: 'x', sessionId: 'sess-1' }, capabilities);

      expect(capturedDuringHandler).toBe(capabilities);
    });

    it('removes capabilities from cache after successful completion', async () => {
      const { deps, hookHandlerRegistry, sessionCapabilityCache } = setupDeps();
      hookHandlerRegistry.register(TRIGGER_ID, async () => ({ value: 'ok' }));

      await invokeHookInternal(
        deps,
        TRIGGER_ID,
        { value: 'x', sessionId: 'sess-1' },
        { token: 'abc' }
      );

      expect(sessionCapabilityCache.has('sess-1')).toBe(false);
    });

    it('removes capabilities from cache even when a handler fails', async () => {
      const { deps, hookHandlerRegistry, sessionCapabilityCache } = setupDeps();
      hookHandlerRegistry.register(TRIGGER_ID, async () => {
        throw new Error('fail');
      });

      await invokeHookInternal(
        deps,
        TRIGGER_ID,
        { value: 'x', sessionId: 'sess-1' },
        { token: 'abc' }
      );

      expect(sessionCapabilityCache.has('sess-1')).toBe(false);
    });

    it('does not store capabilities when no sessionId is present in payload', async () => {
      const { deps, hookHandlerRegistry, sessionCapabilityCache } = setupDeps();
      hookHandlerRegistry.register(TRIGGER_ID, async () => ({ value: 'ok' }));

      await invokeHookInternal(deps, TRIGGER_ID, { value: 'x' }, { token: 'abc' });

      expect(sessionCapabilityCache.size).toBe(0);
    });
  });
});
