/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * RESEARCH ONLY (workload isolation harness) — never merge.
 *
 * Generic plugin-contract traffic tracer. When KBN_RESEARCH_CONTRACT_TRACER=true, every
 * setup/start contract handed to a dependant plugin is wrapped in a Proxy (shadow target,
 * so frozen contracts do not trip Proxy invariants). Per edge (caller -> callee.path) it
 * counts calls, sync/Promise/Observable returns, argument/result kinds and serialized bytes
 * (v8.serialize, with a structural estimate when serialization fails). Function-valued
 * arguments (callbacks, registry entries such as rule type executors) are wrapped so later
 * invocations by the callee are recorded as reverse edges (callee -> caller).
 *
 * Perturbs timing and object identity by design: never enable for performance runs.
 */

import { serialize } from 'v8';

export type ValueKind =
  | 'undefined'
  | 'primitive'
  | 'plain'
  | 'function'
  | 'promise'
  | 'observable'
  | 'class_instance'
  | 'buffer'
  | 'date'
  | 'error'
  | 'map_set';

interface EdgeStats {
  caller: string;
  callee: string;
  lifecycle: string;
  path: string;
  direction: 'forward' | 'reverse';
  calls: number;
  errors: number;
  return_kind: Record<string, number>;
  arg_kinds: Record<string, number>;
  result_kinds: Record<string, number>;
  bytes_in: number;
  bytes_out: number;
  bytes_in_estimated: number;
  bytes_out_estimated: number;
  serialize_failures_in: Record<string, number>;
  serialize_failures_out: Record<string, number>;
  max_bytes_in: number;
  max_bytes_out: number;
  sampled: number;
}

interface Ctx {
  caller: string;
  callee: string;
  lifecycle: string;
  path: string;
  direction: 'forward' | 'reverse';
  depth: number;
}

const MAX_DEPTH = 8;
const KIND_SCAN_DEPTH = 3;

const isObservable = (v: unknown): boolean =>
  !!v && typeof v === 'object' && typeof (v as { subscribe?: unknown }).subscribe === 'function' &&
  typeof (v as { pipe?: unknown }).pipe === 'function';

const isPromise = (v: unknown): v is Promise<unknown> =>
  !!v && (typeof v === 'object' || typeof v === 'function') && typeof (v as { then?: unknown }).then === 'function';

export const kindOf = (v: unknown): ValueKind => {
  if (v === undefined) return 'undefined';
  if (v === null || typeof v !== 'object') return typeof v === 'function' ? 'function' : 'primitive';
  if (isPromise(v)) return 'promise';
  if (isObservable(v)) return 'observable';
  if (Buffer.isBuffer(v) || v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return 'buffer';
  if (v instanceof Date) return 'date';
  if (v instanceof Error) return 'error';
  if (v instanceof Map || v instanceof Set) return 'map_set';
  const proto = Object.getPrototypeOf(v);
  if (proto === Object.prototype || proto === null || Array.isArray(v)) return 'plain';
  return 'class_instance';
};

/** Collects the set of kinds found in a value (nested up to a small depth). */
const collectKinds = (v: unknown, into: Set<ValueKind>, depth = 0, seen = new Set<unknown>()): void => {
  const k = kindOf(v);
  into.add(k);
  if (depth >= KIND_SCAN_DEPTH || k !== 'plain' || seen.has(v)) return;
  seen.add(v);
  const values = Array.isArray(v) ? v.slice(0, 50) : Object.values(v as object).slice(0, 50);
  for (const child of values) collectKinds(child, into, depth + 1, seen);
};

/** Cheap structural size estimate used when v8.serialize fails. */
const estimateBytes = (v: unknown, budget = { nodes: 20000 }, seen = new Set<unknown>()): number => {
  if (budget.nodes-- <= 0) return 0;
  if (v === null || v === undefined) return 1;
  switch (typeof v) {
    case 'string':
      return v.length;
    case 'number':
    case 'bigint':
      return 8;
    case 'boolean':
      return 1;
    case 'function':
      return 0;
  }
  if (seen.has(v)) return 0;
  seen.add(v);
  if (ArrayBuffer.isView(v)) return v.byteLength;
  if (v instanceof ArrayBuffer) return v.byteLength;
  let total = 0;
  for (const key of Object.keys(v as object)) {
    total += key.length + estimateBytes((v as Record<string, unknown>)[key], budget, seen);
  }
  return total;
};

const containsFunction = (v: unknown, depth = 0): boolean => {
  if (typeof v === 'function') return true;
  if (!v || typeof v !== 'object' || depth >= 2 || kindOf(v) !== 'plain') return false;
  const values = Array.isArray(v) ? v.slice(0, 50) : Object.values(v).slice(0, 50);
  return values.some((child) => containsFunction(child, depth + 1));
};

const shouldWrapObject = (v: unknown): boolean => {
  const k = kindOf(v);
  return k === 'plain' || k === 'class_instance' || k === 'observable';
};

class ContractTracer {
  private readonly edges = new Map<string, EdgeStats>();
  private readonly proxies = new WeakMap<object, Map<string, unknown>>();
  public readonly startedAt = Date.now();
  public wrapErrors = 0;

  public snapshot(): EdgeStats[] {
    return [...this.edges.values()];
  }

  public reset(): void {
    this.edges.clear();
  }

  private edge(ctx: Ctx): EdgeStats {
    const key = `${ctx.direction}|${ctx.caller}|${ctx.callee}|${ctx.lifecycle}|${ctx.path}`;
    let e = this.edges.get(key);
    if (!e) {
      e = {
        caller: ctx.direction === 'forward' ? ctx.caller : ctx.callee,
        callee: ctx.direction === 'forward' ? ctx.callee : ctx.caller,
        lifecycle: ctx.lifecycle,
        path: ctx.path,
        direction: ctx.direction,
        calls: 0,
        errors: 0,
        return_kind: {},
        arg_kinds: {},
        result_kinds: {},
        bytes_in: 0,
        bytes_out: 0,
        bytes_in_estimated: 0,
        bytes_out_estimated: 0,
        serialize_failures_in: {},
        serialize_failures_out: {},
        max_bytes_in: 0,
        max_bytes_out: 0,
        sampled: 0,
      };
      this.edges.set(key, e);
    }
    return e;
  }

  private measure(e: EdgeStats, value: unknown, dir: 'in' | 'out'): void {
    const kinds = new Set<ValueKind>();
    collectKinds(value, kinds);
    const target = dir === 'in' ? e.arg_kinds : e.result_kinds;
    for (const k of kinds) target[k] = (target[k] ?? 0) + 1;
    let bytes: number;
    try {
      bytes = serialize(value).length;
    } catch {
      const failures = dir === 'in' ? e.serialize_failures_in : e.serialize_failures_out;
      for (const k of kinds) if (k !== 'plain' && k !== 'primitive' && k !== 'undefined') failures[k] = (failures[k] ?? 0) + 1;
      bytes = estimateBytes(value);
      if (dir === 'in') e.bytes_in_estimated += bytes;
      else e.bytes_out_estimated += bytes;
    }
    if (dir === 'in') {
      e.bytes_in += bytes;
      e.max_bytes_in = Math.max(e.max_bytes_in, bytes);
    } else {
      e.bytes_out += bytes;
      e.max_bytes_out = Math.max(e.max_bytes_out, bytes);
    }
  }

  /** Wraps a value crossing a plugin boundary; identity is stable per (value, edge path). */
  public wrap<T>(value: T, ctx: Ctx): T {
    if (ctx.depth > MAX_DEPTH) return value;
    if (typeof value === 'function') return this.cached(value as unknown as object, ctx, () => this.wrapFunction(value as unknown as (...a: unknown[]) => unknown, ctx)) as T;
    if (value && typeof value === 'object' && shouldWrapObject(value)) {
      return this.cached(value as unknown as object, ctx, () => this.wrapObject(value as unknown as object, ctx)) as T;
    }
    return value;
  }

  private cached(value: object, ctx: Ctx, create: () => unknown): unknown {
    const key = `${ctx.direction}|${ctx.caller}|${ctx.callee}|${ctx.path}`;
    let byKey = this.proxies.get(value);
    if (!byKey) {
      byKey = new Map();
      this.proxies.set(value, byKey);
    }
    if (!byKey.has(key)) {
      try {
        byKey.set(key, create());
      } catch {
        this.wrapErrors++;
        return value;
      }
    }
    return byKey.get(key);
  }

  private wrapObject(real: object, ctx: Ctx): object {
    const shadow = Object.create(Object.getPrototypeOf(real));
    const tracer = this;
    return new Proxy(shadow, {
      get(_t, prop) {
        const v = Reflect.get(real, prop, real);
        if (typeof prop === 'symbol') return typeof v === 'function' ? v.bind(real) : v;
        if (
          typeof v === 'function' ||
          (v && typeof v === 'object' && shouldWrapObject(v) && (kindOf(v) !== 'plain' || containsFunction(v)))
        ) {
          return tracer.wrap(v, { ...ctx, path: `${ctx.path}.${prop}`, depth: ctx.depth + 1 });
        }
        return v;
      },
      set(_t, prop, v) {
        return Reflect.set(real, prop, v);
      },
      has(_t, prop) {
        return Reflect.has(real, prop);
      },
      ownKeys() {
        return Reflect.ownKeys(real);
      },
      getOwnPropertyDescriptor(_t, prop) {
        const d = Reflect.getOwnPropertyDescriptor(real, prop);
        return d ? { ...d, configurable: true } : undefined;
      },
      getPrototypeOf() {
        return Object.getPrototypeOf(real);
      },
      defineProperty(_t, prop, d) {
        return Reflect.defineProperty(real, prop, d);
      },
      deleteProperty(_t, prop) {
        return Reflect.deleteProperty(real, prop);
      },
    });
  }

  private wrapFunction(real: (...a: unknown[]) => unknown, ctx: Ctx): unknown {
    const tracer = this;
    // Shadow function target: keeps typeof === 'function' and avoids invariants on real.
    const shadow = function () {} as unknown as (...a: unknown[]) => unknown;
    return new Proxy(shadow, {
      apply(_t, thisArg, args: unknown[]) {
        return tracer.call(real, thisArg, args, ctx);
      },
      construct(_t, args, newTarget) {
        return Reflect.construct(real, args, newTarget === shadow ? real : newTarget);
      },
      get(_t, prop) {
        return Reflect.get(real, prop, real);
      },
      has(_t, prop) {
        return Reflect.has(real, prop);
      },
      getPrototypeOf() {
        return Object.getPrototypeOf(real);
      },
    });
  }

  private call(real: (...a: unknown[]) => unknown, thisArg: unknown, args: unknown[], ctx: Ctx): unknown {
    const e = this.edge(ctx);
    e.calls++;
    e.sampled++;
    this.measure(e, args, 'in');
    // Function-valued args (and data objects carrying functions) cross back: reverse edges.
    const reverse: Ctx = {
      caller: ctx.caller,
      callee: ctx.callee,
      lifecycle: ctx.lifecycle,
      direction: ctx.direction === 'forward' ? 'reverse' : 'forward',
      depth: ctx.depth + 1,
      path: '',
    };
    const passedArgs = args.map((a, i) =>
      containsFunction(a) ? this.wrap(a, { ...reverse, path: `${ctx.path}(arg${i})` }) : a
    );
    let result: unknown;
    try {
      // Unwrapped receiver: private class fields and brand checks keep working.
      result = Reflect.apply(real, thisArg, passedArgs);
    } catch (err) {
      e.errors++;
      throw err;
    }
    if (isPromise(result)) {
      e.return_kind.promise = (e.return_kind.promise ?? 0) + 1;
      const tracer = this;
      return (result as Promise<unknown>).then(
        (v) => {
          tracer.measure(e, v, 'out');
          return containsFunction(v) || kindOf(v) === 'class_instance'
            ? tracer.wrap(v, { ...ctx, path: `${ctx.path}()`, depth: ctx.depth + 1 })
            : v;
        },
        (err) => {
          e.errors++;
          throw err;
        }
      );
    }
    if (isObservable(result)) {
      e.return_kind.observable = (e.return_kind.observable ?? 0) + 1;
      this.measure(e, undefined, 'out');
      return result;
    }
    e.return_kind.sync = (e.return_kind.sync ?? 0) + 1;
    this.measure(e, result, 'out');
    if (typeof result === 'function' || containsFunction(result) || kindOf(result) === 'class_instance') {
      return this.wrap(result, { ...ctx, path: `${ctx.path}()`, depth: ctx.depth + 1 });
    }
    return result;
  }
}

const GLOBAL_KEY = '__kbnResearchContractTracer';

export const isContractTracerEnabled = (): boolean =>
  process.env.KBN_RESEARCH_CONTRACT_TRACER === 'true';

const getTracer = (): ContractTracer => {
  const g = globalThis as unknown as Record<string, ContractTracer | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new ContractTracer();
  return g[GLOBAL_KEY] as ContractTracer;
};

/** Wraps one dependency contract handed from `callee` to `caller` (no-op unless enabled). */
export const traceContract = <T>(caller: string, callee: string, lifecycle: string, contract: T): T => {
  if (!isContractTracerEnabled() || contract === null || contract === undefined) return contract;
  return getTracer().wrap(contract, { caller, callee, lifecycle, path: callee, direction: 'forward', depth: 0 });
};
