/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Smoke tests for @kbn/cordis.
 *
 * Purpose: lock in the behaviours that the Kibana plugin adapter depends on,
 * so that a cordis rc upgrade that changes them fails here rather than in
 * production or in a hard-to-diagnose boot regression.
 */

import { Context, FiberState } from '.';

describe('@kbn/cordis barrel', () => {
  it('loads without throwing', () => {
    expect(() => new Context()).not.toThrow();
  });

  it('constructs a root context with built-in services', () => {
    const ctx = new Context();
    expect(ctx.registry).toBeDefined();
    expect(ctx.events).toBeDefined();
    expect(ctx.logger).toBeDefined();
    expect(ctx.reflect).toBeDefined();
  });
});

describe('Fiber.await() with unsatisfied inject — critical rc contract', () => {
  /**
   * A fiber whose declared `inject` key is not yet provided has
   * `inertia === undefined` (no in-flight transition), so `Fiber.await()`
   * resolves immediately without error.  This means:
   *
   *   const fiber = ctx.plugin({ inject: ['missing'], apply() {} });
   *   await fiber;   // resolves immediately — fiber is PENDING, NOT ACTIVE
   *
   * The Kibana adapter MUST call `assertActive(fiber, plugin)` after every
   * `await ctx.plugin(...)`.  Without it, a missing dep silently produces a
   * non-functional plugin with no error or warning.
   *
   * If this test fails after a cordis upgrade it means the rc changed the
   * inertia/await semantics.  Review the upgrade carefully before proceeding.
   */
  it('resolves immediately when inject is unsatisfied (fiber stays PENDING)', async () => {
    const ctx = new Context();

    const fiber = ctx.plugin({ inject: ['nonexistent.service'], apply() {} });
    // Should resolve almost immediately — well under 50 ms
    const resolved = await Promise.race([
      (async () => {
        await fiber;
        return 'resolved';
      })(),
      new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 50)),
    ]);

    expect(resolved).toBe('resolved');
    expect(fiber.state).toBe(FiberState.PENDING);
  });

  it('does NOT throw when a fiber is PENDING on await', async () => {
    const ctx = new Context();
    const fiber = ctx.plugin({ inject: ['nonexistent.service'], apply() {} });
    // Must not throw — errors are only surfaced on _error, not on pending
    await expect(fiber).resolves.toBeDefined();
    expect(fiber.state).not.toBe(FiberState.ACTIVE);
  });
});

describe('ctx.get cannot distinguish undefined from absent', () => {
  /**
   * If a plugin's setup() returns undefined (e.g. `setup() {}`), and the
   * adapter does `ctx.set('foo', undefined)`, then `ctx.get('foo')` returns
   * undefined — indistinguishable from "key not provided at all".
   *
   * This is why the adapter MUST box contracts: `ctx.set('foo', { contract })`.
   */
  it('returns undefined for a key that was never set', () => {
    const ctx = new Context();
    // ctx.reflect.get bypasses the proxy access-control check
    expect(ctx.reflect.get('undeclared.key')).toBeUndefined();
  });
});

describe('logger ring-buffer default', () => {
  /**
   * Without a registered exporter, Cordis logs only to an in-memory ring
   * buffer.  An activation error in a plugin apply() function goes to
   * ctx.logger.error and is therefore INVISIBLE unless an exporter is
   * registered.  The adapter must register a Kibana logger bridge immediately
   * after constructing the root context.
   */
  it('does not write to stdout/stderr by default', () => {
    const spy = jest.spyOn(process.stdout, 'write');
    const spyErr = jest.spyOn(process.stderr, 'write');

    const ctx = new Context();
    ctx.logger.error(new Error('test error — should not appear in stdout'));

    expect(spy).not.toHaveBeenCalled();
    expect(spyErr).not.toHaveBeenCalled();

    spy.mockRestore();
    spyErr.mockRestore();
  });
});
