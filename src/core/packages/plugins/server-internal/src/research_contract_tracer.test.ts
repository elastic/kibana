/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { kindOf, traceContract } from './research_contract_tracer';

interface Snapshot {
  snapshot(): Array<Record<string, any>>;
  reset(): void;
}
const tracer = () =>
  (globalThis as unknown as Record<string, Snapshot>).__kbnResearchContractTracer;

class Client {
  #secret = 42;
  read() {
    return this.#secret;
  }
}

const makeContract = () => {
  const registry: Array<{ id: string; executor: (x: number) => number }> = [];
  const client = new Client();
  return {
    contract: Object.freeze({
      getClient: () => client,
      client,
      register: (def: { id: string; executor: (x: number) => number }) => registry.push(def),
      runAll: (x: number) => registry.map((d) => d.executor(x)),
      echoUrl: (u: URL) => u.toString(),
      isOwnClient: (c: Client) => c === client,
      fetch: async (q: string) => ({ q, rows: [1, 2, 3] }),
    }),
    client,
  };
};

describe('research contract tracer', () => {
  const env = process.env.KBN_RESEARCH_CONTRACT_TRACER;
  beforeAll(() => {
    process.env.KBN_RESEARCH_CONTRACT_TRACER = 'true';
  });
  afterAll(() => {
    process.env.KBN_RESEARCH_CONTRACT_TRACER = env;
  });
  beforeEach(() => tracer()?.reset());

  it('is a no-op when disabled', () => {
    process.env.KBN_RESEARCH_CONTRACT_TRACER = 'false';
    const { contract } = makeContract();
    expect(traceContract('a', 'b', 'start', contract)).toBe(contract);
    process.env.KBN_RESEARCH_CONTRACT_TRACER = 'true';
  });

  it('keeps private fields, native brand checks and owner identity working (frozen contract)', () => {
    const { contract, client } = makeContract();
    const traced = traceContract('caller', 'callee', 'start', contract);
    expect(traced.getClient().read()).toBe(42);
    expect(traced.client.read()).toBe(42);
    expect(traced.echoUrl(new URL('http://x/y'))).toBe('http://x/y');
    // A proxy handed back to its owner is unwrapped.
    expect(traced.isOwnClient(traced.getClient())).toBe(true);
    expect(traced.getClient).toBe(traced.getClient);
    expect(client.read()).toBe(42);
  });

  it('records forward edges, return kinds and reverse (callback) edges', async () => {
    const { contract } = makeContract();
    const traced = traceContract('alerting', 'actions', 'start', contract);
    traced.register({ id: 'r1', executor: (x) => x + 1 });
    expect(traced.runAll(1)).toEqual([2]);
    expect(traced.runAll(2)).toEqual([3]);
    await traced.fetch('q');
    const edges = tracer().snapshot();
    const byPath = (p: string, dir = 'forward') =>
      edges.find((e) => e.path === p && e.direction === dir) as Record<string, any>;
    expect(byPath('actions.runAll').calls).toBe(2);
    expect(byPath('actions.runAll').return_kind).toEqual({ sync: 2 });
    expect(byPath('actions.fetch').return_kind).toEqual({ promise: 1 });
    expect(byPath('actions.fetch').bytes_out).toBeGreaterThan(0);
    const reverse = byPath('actions.register(arg0).executor', 'reverse');
    expect(reverse).toMatchObject({ caller: 'actions', callee: 'alerting', calls: 2 });
    expect(byPath('actions.register').arg_kinds.function).toBe(1);
  });

  it('classifies value kinds', () => {
    expect(kindOf({ a: 1 })).toBe('plain');
    expect(kindOf(new Client())).toBe('class_instance');
    expect(kindOf(Buffer.from('x'))).toBe('buffer');
    expect(kindOf(Promise.resolve())).toBe('promise');
    expect(kindOf(() => 1)).toBe('function');
  });
});
