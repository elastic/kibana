/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ISLAND_MODULE, RpcEndpoint } from './wire';
import type { Msg, Transport } from './wire';
import { wrapImportedFnWithStubs } from './type_derived_adapters';

/**
 * In-process transport pair: structuredClone on every hop (same cloning rules as postMessage);
 * async messages are delivered on a microtask, the island's blocking call is dispatched to the
 * main endpoint synchronously and returns main's sync reply.
 */
const createPair = () => {
  let mainCb: (m: Msg) => void = () => undefined;
  let islandCb: (m: Msg) => void = () => undefined;
  let syncReply: Msg | undefined;
  const mainT: Transport = {
    post: (m) => {
      const c = structuredClone(m);
      queueMicrotask(() => islandCb(c));
    },
    onMessage: (cb) => (mainCb = cb),
    replySync: (m) => (syncReply = structuredClone(m)),
  };
  const islandT: Transport = {
    post: (m) => {
      const c = structuredClone(m);
      queueMicrotask(() => mainCb(c));
    },
    onMessage: (cb) => (islandCb = cb),
    callSync: (m) => {
      syncReply = undefined;
      mainCb(structuredClone(m));
      if (!syncReply) throw new Error('no sync reply');
      return syncReply;
    },
  };
  const main = new RpcEndpoint('main', mainT);
  const island = new RpcEndpoint('island', islandT);
  return { main, island };
};

const cross = (from: RpcEndpoint, to: RpcEndpoint, value: unknown) =>
  to.decode(structuredClone(from.encode(value, 'test')));

describe('research island RPC', () => {
  it('main→island calls always return a Promise (main never waits)', async () => {
    const { main, island } = createPair();
    const contract = cross(island, main, { echo: (x: number) => x + 1 }) as {
      echo: (x: number) => unknown;
    };
    const result = contract.echo(1);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBe(2);
  });

  it('island→main calls keep their sync/async shape', async () => {
    const { main, island } = createPair();
    const core = cross(main, island, {
      add: (a: number, b: number) => a + b,
      later: async (x: number) => x * 2,
    }) as { add: (a: number, b: number) => number; later: (x: number) => Promise<number> };
    expect(core.add(2, 3)).toBe(5);
    await expect(core.later(4)).resolves.toBe(8);
  });

  it('owner identity survives a round trip (registries hand objects back)', async () => {
    const { main, island } = createPair();
    const registry = cross(island, main, { roundtrip: (o: unknown) => o }) as {
      roundtrip: (o: unknown) => Promise<unknown>;
    };
    const definition = { id: 'x', handler: () => 1 };
    await expect(registry.roundtrip(definition)).resolves.toBe(definition);
  });

  it('errors cross with their own properties', async () => {
    const { main, island } = createPair();
    const core = cross(main, island, {
      fail: () => {
        const e = new Error('boom') as Error & { statusCode?: number };
        e.statusCode = 418;
        throw e;
      },
    }) as { fail: () => void };
    expect(() => core.fail()).toThrow('boom');
    try {
      core.fail();
    } catch (e) {
      expect((e as { statusCode?: number }).statusCode).toBe(418);
    }
  });

  it('JS Proxies cross as dynamic handles (B2: lazy schema proxies looked like {})', () => {
    const { main, island } = createPair();
    const target = { safeParse: (v: unknown) => ({ success: v === 'ok' }) };
    const lazy = new Proxy(target, {});
    const remote = cross(main, island, lazy) as typeof target;
    expect(typeof remote.safeParse).toBe('function');
    expect(remote.safeParse('ok')).toEqual({ success: true });
    expect('safeParse' in remote).toBe(true);
  });

  it('a value that cannot be cloned becomes a caller error, never a crash (B1)', async () => {
    const { main, island } = createPair();
    const contract = cross(island, main, {
      leak: () => new Map([['k', new WeakMap()]]),
    }) as { leak: () => Promise<unknown> };
    await expect(contract.leak()).rejects.toThrow(/could not cross/);
    expect(island.breakages.map((b) => b.kind)).toContain('clone');
  });

  it('values marked with a module specifier are loaded by the receiver', () => {
    const { main, island } = createPair();
    const marked = { sep: '/' };
    Object.defineProperty(marked, ISLAND_MODULE, { value: { specifier: 'path', export: 'posix' } });
    const loaded = cross(main, island, marked) as { sep: string };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(loaded).toBe(require('path').posix);
  });

  it('type-derived SYNC_STUB: createTaskRunner returns a local runner synchronously', async () => {
    const remote = jest.fn(async () => ({
      run: async () => 'ran',
      cancel: async () => 'cancelled',
    }));
    const stub = wrapImportedFnWithStubs(
      remote,
      'taskManager.setup.registerTaskDefinitions(arg0).workflow:run.createTaskRunner'
    ) as (ctx: unknown) => { run: () => Promise<unknown>; cancel: () => Promise<unknown> };
    const runner = stub({});
    expect(runner).not.toBeInstanceOf(Promise);
    await expect(runner.run()).resolves.toBe('ran');
    await expect(runner.cancel()).resolves.toBe('cancelled');
    expect(remote).toHaveBeenCalledTimes(1);
  });
});
