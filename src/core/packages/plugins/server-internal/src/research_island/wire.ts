/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * RESEARCH ONLY (workload isolation, Track 2 "transparent islands") — never merge.
 *
 * Generic handle-table RPC used to run a set of plugins in another isolate (worker thread or
 * child process) while their contracts stay usable from the main isolate and vice versa.
 *
 * - Data crosses by value (structured clone / v8 serialize).
 * - Functions, class instances, Observables, Promises and AbortSignals cross as remote handles
 *   owned by the sender; handing a handle back to its owner unwraps to the real object
 *   (identity, `#private`, brand checks survive on the owner side).
 * - The main isolate never waits synchronously: main→island calls always return a Promise.
 * - The island waits synchronously on main (Atomics / blocking read): island→main calls keep
 *   their real sync/async shape (a Promise-returning main function yields a pending marker and
 *   is settled later by an async message).
 * - Every crossing is counted per handle label (and optionally sized) so per-edge traffic is
 *   visible again (the cost of an in-process call becomes invisible otherwise).
 */

import { serialize } from 'v8';
import { types } from 'util';
import { Observable } from 'rxjs';

export type Side = 'main' | 'island';

export type Msg = Record<string, unknown> & { t: string };

export interface Transport {
  post(msg: Msg): void;
  onMessage(cb: (msg: Msg) => void): void;
  /** Island only: blocks until the peer replies. */
  callSync?(msg: Msg): Msg;
  /** Main only: reply to a blocking call from the island. */
  replySync?(msg: Msg): void;
}

export interface EdgeStat {
  label: string;
  /** calls this side issued on a remote handle */
  out_calls: number;
  out_sync: number;
  out_pending: number;
  out_bytes: number;
  /** calls the peer issued on a handle this side owns */
  in_calls: number;
  in_bytes: number;
  in_errors: number;
  /** bytes of results this side sent back for calls on its handles */
  ret_bytes: number;
  in_ms: number;
  in_ms_max: number;
  sync_wait_ms: number;
  sync_wait_ms_max: number;
}

interface ExportEntry {
  value: unknown;
  label: string;
  sends: number;
}

type Wire = unknown;

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
  label: string;
}

/** Hook used by the host to apply type-derived stubs to imported functions. */
export type ImportedFnWrapper = (fn: (...args: unknown[]) => unknown, label: string) => unknown;

const isThenable = (v: unknown): v is PromiseLike<unknown> =>
  !!v &&
  (typeof v === 'object' || typeof v === 'function') &&
  typeof (v as { then?: unknown }).then === 'function';

const isObservableLike = (v: unknown): boolean =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as { subscribe?: unknown }).subscribe === 'function' &&
  typeof (v as { pipe?: unknown }).pipe === 'function';

const nativeCtorCache = new WeakMap<object, boolean>();
const isNativeInstance = (v: object): boolean => {
  const ctor = (v as { constructor?: unknown }).constructor;
  if (typeof ctor !== 'function') return false;
  let native = nativeCtorCache.get(ctor);
  if (native === undefined) {
    native = Function.prototype.toString.call(ctor).includes('[native code]') && ctor !== Object;
    nativeCtorCache.set(ctor, native);
  }
  return native;
};

const isPlainObject = (v: object): boolean => {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/** True for plain objects/arrays (and cloneable natives) without behaviour, bounded size. */
const isPlainData = (v: unknown, depth = 0, budget = { n: 2000 }): boolean => {
  if (v === null || typeof v !== 'object') return typeof v !== 'function' && typeof v !== 'symbol';
  if (--budget.n < 0 || depth > 8) return false;
  if (Array.isArray(v)) return v.every((item) => isPlainData(item, depth + 1, budget));
  if (v instanceof Date || v instanceof RegExp || ArrayBuffer.isView(v)) return true;
  if (!isPlainObject(v) || types.isProxy(v)) return false;
  for (const key of Object.keys(v)) {
    const d = Object.getOwnPropertyDescriptor(v, key);
    if (!d || d.get || !isPlainData(d.value, depth + 1, budget)) return false;
  }
  return true;
};

const protoMethodsCache = new WeakMap<object, { methods: string[]; getters: string[] }>();
const collectProto = (v: object): { methods: string[]; getters: string[] } => {
  const first = Object.getPrototypeOf(v);
  const cached = first && protoMethodsCache.get(first);
  if (cached) return cached;
  const methods = new Set<string>();
  const getters = new Set<string>();
  let proto = first;
  while (proto && proto !== Object.prototype && proto !== Function.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor' || methods.has(key) || getters.has(key)) continue;
      const d = Object.getOwnPropertyDescriptor(proto, key);
      if (!d) continue;
      if (d.get) getters.add(key);
      else if (typeof d.value === 'function') methods.add(key);
    }
    proto = Object.getPrototypeOf(proto);
  }
  const result = { methods: [...methods], getters: [...getters] };
  if (first) protoMethodsCache.set(first, result);
  return result;
};

const MAX_DEPTH = 64;

/**
 * Conformance marker for values that are remotable by module specifier: the receiver loads
 * `require(specifier)[export]` itself instead of getting a handle (code runs where it is called).
 */
export const ISLAND_MODULE = Symbol.for('kbn.research.islandModule');

export class RpcEndpoint {
  private nextId = 1;
  private nextCid = 1;
  private readonly exports = new Map<number, ExportEntry>();
  private readonly exportIds = new WeakMap<object, number>();
  private readonly symbolExports = new Map<symbol, number>();
  private readonly importedById = new Map<number, WeakRef<object>>();
  private readonly importedSymbols = new Map<number, symbol>();
  private readonly importReceived = new Map<number, number>();
  private readonly remoteIdOf = new WeakMap<object, number>();
  private readonly pending = new Map<number, Pending>();
  private readonly pendingSettles = new Map<number, Pending>();
  private readonly subscriptions = new Map<number, { unsubscribe(): void }>();
  private readonly subscribers = new Map<
    number,
    { next(v: unknown): void; error(e: unknown): void; complete(): void }
  >();
  private readonly importedSignals = new Map<number, AbortController>();
  private readonly releaseQueue = new Map<number, number>();
  private releaseTimer?: NodeJS.Timeout;
  private readonly finalizer = new FinalizationRegistry<number>((id) => this.onFinalized(id));
  public readonly stats = new Map<string, EdgeStat>();
  public readonly breakages: Array<{ kind: string; label: string; detail: string; at: string }> =
    [];
  public measureBytes = false;
  /** Optional label overrides for well-known objects (contracts, core). */
  public readonly labelHints = new WeakMap<object, string>();
  public wrapImportedFn?: ImportedFnWrapper;
  public onBreakage?: (b: { kind: string; label: string; detail: string }) => void;

  constructor(public readonly side: Side, private readonly transport: Transport) {
    transport.onMessage((msg) => this.onMessage(msg));
  }

  // ---------------------------------------------------------------- stats

  private stat(label: string): EdgeStat {
    let s = this.stats.get(label);
    if (!s) {
      s = {
        label,
        out_calls: 0,
        out_sync: 0,
        out_pending: 0,
        out_bytes: 0,
        in_calls: 0,
        in_bytes: 0,
        in_errors: 0,
        ret_bytes: 0,
        in_ms: 0,
        in_ms_max: 0,
        sync_wait_ms: 0,
        sync_wait_ms_max: 0,
      };
      this.stats.set(label, s);
    }
    return s;
  }

  private sizeOf(msg: Msg): number {
    if (!this.measureBytes) return 0;
    try {
      return serialize(msg).length;
    } catch {
      return -1;
    }
  }

  public breakage(kind: string, label: string, detail: string): void {
    const b = { kind, label, detail, at: new Date().toISOString() };
    if (this.breakages.length < 2000) this.breakages.push(b);
    this.onBreakage?.(b);
  }

  /** True when `value` is a handle imported from the peer. */
  public isRemote(value: unknown): boolean {
    return (
      !!value &&
      (typeof value === 'object' || typeof value === 'function') &&
      this.remoteIdOf.has(value as object)
    );
  }

  public tableSizes(): { exports: number; imports: number; pending: number; subs: number } {
    let alive = 0;
    for (const ref of this.importedById.values()) if (ref.deref()) alive++;
    return {
      exports: this.exports.size,
      imports: alive,
      pending: this.pending.size + this.pendingSettles.size,
      subs: this.subscriptions.size + this.subscribers.size,
    };
  }

  // ---------------------------------------------------------------- export side

  /** Registers a root object under a fixed id (bootstrap API). */
  public exposeRoot(value: object, label: string): void {
    this.exports.set(0, { value, label, sends: Number.POSITIVE_INFINITY });
    this.exportIds.set(value, 0);
  }

  private exportValue(value: object, label: string): number {
    let id = this.exportIds.get(value);
    if (id === undefined) {
      id = this.nextId++;
      this.exportIds.set(value, id);
      this.exports.set(id, { value, label, sends: 0 });
    }
    const entry = this.exports.get(id)!;
    entry.sends++;
    return id;
  }

  public encode(v: unknown, label: string, depth = 0, seen?: Set<object>): Wire {
    if (v === null || v === undefined) return v;
    const type = typeof v;
    if (type === 'symbol') {
      let id = this.symbolExports.get(v as symbol);
      if (id === undefined) {
        id = this.nextId++;
        this.symbolExports.set(v as symbol, id);
      }
      return { $: 'sym', id, d: (v as symbol).description };
    }
    if (type !== 'object' && type !== 'function') return v;
    const obj = v as object;
    const remoteId = this.remoteIdOf.get(obj);
    if (remoteId !== undefined) return { $: 'ref', id: remoteId };
    label = this.labelHints.get(obj) ?? label;
    const moduleRef = (obj as Record<symbol, { specifier: string; export: string } | undefined>)[
      ISLAND_MODULE
    ];
    if (moduleRef && Object.prototype.hasOwnProperty.call(obj, ISLAND_MODULE)) {
      return { $: 'mod', specifier: moduleRef.specifier, export: moduleRef.export };
    }
    if (type === 'function') {
      return {
        $: 'fn',
        id: this.exportValue(obj, label),
        name: (v as { name?: string }).name ?? '',
        label,
      };
    }
    if (isThenable(obj)) {
      const id = this.exportValue(obj, label);
      this.settleLater(id, obj as PromiseLike<unknown>, label);
      return { $: 'prom', id, label };
    }
    if (obj instanceof Error) return this.encodeError(obj, label);
    if (Buffer.isBuffer(obj)) return { $: 'buf', v: new Uint8Array(obj) };
    if (obj instanceof URL) return { $: 'url', href: obj.href };
    if (typeof AbortSignal !== 'undefined' && obj instanceof AbortSignal) {
      const id = this.exportValue(obj, label);
      if (!obj.aborted) {
        obj.addEventListener(
          'abort',
          () => this.post({ t: 'abort', id, reason: String(obj.reason ?? '') }),
          { once: true }
        );
      }
      return { $: 'sig', id, aborted: obj.aborted };
    }
    if (isObservableLike(obj)) {
      return { $: 'obs', id: this.exportValue(obj, label), label };
    }
    if (types.isProxy(obj)) {
      // JS Proxies (lazy schemas, tracer wrappers) are opaque to structural encoding: every
      // property access goes back to the owner.
      return { $: 'dyn', id: this.exportValue(obj, label), label };
    }
    if (depth > MAX_DEPTH) {
      this.breakage('depth', label, `object graph deeper than ${MAX_DEPTH}; sent as handle`);
      return this.encodeHandle(obj, label, depth, seen);
    }
    if (Array.isArray(obj)) {
      seen = seen ?? new Set();
      if (seen.has(obj)) return this.encodeHandle(obj, label, depth, seen);
      seen.add(obj);
      const out = obj.map((item) => this.encode(item, `${label}[]`, depth + 1, seen));
      seen.delete(obj);
      return out;
    }
    if (isPlainObject(obj)) {
      seen = seen ?? new Set();
      if (seen.has(obj)) return this.encodeHandle(obj, label, depth, seen);
      // Behavioural plain objects (own functions or accessors) cross as handles so that
      // identity survives a round trip back to the owner (registries hand objects back).
      for (const key of Object.keys(obj)) {
        const d = Object.getOwnPropertyDescriptor(obj, key);
        if (d && (d.get || typeof d.value === 'function')) {
          return this.encodeHandle(obj, label, depth, seen);
        }
      }
      seen.add(obj);
      const out: Record<string, Wire> = {};
      for (const key of Object.keys(obj)) {
        out[key] = this.encode(
          (obj as Record<string, unknown>)[key],
          `${label}.${key}`,
          depth + 1,
          seen
        );
      }
      seen.delete(obj);
      return '$' in out ? { $: 'esc', v: out } : out;
    }
    if (obj instanceof Map) {
      return {
        $: 'map',
        e: [...obj.entries()].map(([k, val]) => [
          this.encode(k, `${label}.key`, depth + 1, seen),
          this.encode(val, `${label}.get`, depth + 1, seen),
        ]),
      };
    }
    if (obj instanceof Set) {
      return { $: 'set', e: [...obj].map((val) => this.encode(val, `${label}[]`, depth + 1, seen)) };
    }
    if (isNativeInstance(obj)) {
      // Date, RegExp, typed arrays: structured clone handles them (or fails loudly).
      return obj;
    }
    return this.encodeHandle(obj, label, depth, seen);
  }

  private encodeHandle(obj: object, label: string, depth: number, seen?: Set<object>): Wire {
    const id = this.exportValue(obj, label);
    const data: Record<string, Wire> = {};
    const fns: string[] = [];
    const getters: string[] = [];
    seen = seen ?? new Set();
    seen.add(obj);
    for (const key of Object.keys(obj)) {
      const d = Object.getOwnPropertyDescriptor(obj, key);
      if (!d) continue;
      const value = d.value;
      if (d.get) {
        getters.push(key);
      } else if (typeof value === 'function') {
        fns.push(key);
      } else if (value === null || typeof value !== 'object') {
        data[key] = this.encode(value, `${label}.${key}`, depth + 1, seen);
      } else if (this.side === 'main' && !isPlainData(value)) {
        // main → island: nested behaviour is read lazily (the island may wait on main);
        // eager snapshots of e.g. an ES client walk sockets and agents.
        getters.push(key);
      } else if (depth < 16) {
        data[key] = this.encode(value, `${label}.${key}`, depth + 1, seen);
      } else {
        this.breakage('depth', label, `nested handle deeper than 16 at ${key}`);
      }
    }
    seen.delete(obj);
    const proto = collectProto(obj);
    return {
      $: 'obj',
      id,
      ctor: (obj as { constructor?: { name?: string } }).constructor?.name ?? 'Object',
      data,
      fns,
      methods: proto.methods,
      getters: [...getters, ...proto.getters],
      label,
    };
  }

  private encodeError(err: unknown, label: string): Wire {
    if (!(err instanceof Error)) return { $: 'err', name: 'Error', message: String(err), props: {} };
    const props: Record<string, Wire> = {};
    for (const key of Object.keys(err)) {
      try {
        props[key] = this.encode((err as unknown as Record<string, unknown>)[key], label, 1);
      } catch {
        // ignore unencodable error props
      }
    }
    return {
      $: 'err',
      name: err.name,
      ctor: err.constructor?.name,
      message: err.message,
      stack: err.stack,
      props,
    };
  }

  // ---------------------------------------------------------------- import side

  public decode(w: Wire): unknown {
    if (w === null || typeof w !== 'object') return w;
    if (Array.isArray(w)) return w.map((item) => this.decode(item));
    if (!isPlainObject(w as object)) return w;
    const tagged = w as Record<string, unknown>;
    switch (tagged.$) {
      case undefined:
        break;
      case 'esc':
        return this.decodePlain(tagged.v as Record<string, Wire>);
      case 'ref': {
        const entry = this.exports.get(tagged.id as number);
        if (!entry) {
          this.breakage('stale-ref', String(tagged.id), 'peer referenced a released handle');
          return undefined;
        }
        return entry.value;
      }
      case 'sym': {
        const id = tagged.id as number;
        let s = this.importedSymbols.get(id);
        if (!s) {
          s = Symbol(tagged.d as string | undefined);
          this.importedSymbols.set(id, s);
        }
        return s;
      }
      case 'fn':
        return this.importFn(tagged.id as number, tagged.name as string, tagged.label as string);
      case 'obj':
        return this.importObj(tagged);
      case 'prom':
        return this.importPromise(tagged.id as number, tagged.label as string);
      case 'err':
        return this.decodeError(tagged);
      case 'buf': {
        const u8 = tagged.v as Uint8Array;
        return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);
      }
      case 'url':
        return new URL(tagged.href as string);
      case 'map':
        return new Map(
          (tagged.e as Array<[Wire, Wire]>).map(([k, val]) => [this.decode(k), this.decode(val)])
        );
      case 'set':
        return new Set((tagged.e as Wire[]).map((val) => this.decode(val)));
      case 'sig':
        return this.importSignal(tagged.id as number, tagged.aborted as boolean);
      case 'obs':
        return this.importObservable(tagged.id as number, tagged.label as string);
      case 'mod': {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const loaded = require(tagged.specifier as string) as Record<string, unknown>;
        this.stat(`module:${tagged.export}`).in_calls++;
        return loaded[tagged.export as string];
      }
      case 'dyn':
        return this.importDynamic(tagged.id as number, tagged.label as string);
      default:
        break;
    }
    return this.decodePlain(tagged);
  }

  private decodePlain(w: Record<string, Wire>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(w)) out[key] = this.decode(w[key]);
    return out;
  }

  private decodeError(tagged: Record<string, unknown>): Error {
    const err = new Error(tagged.message as string);
    err.name = tagged.name as string;
    if (tagged.stack) err.stack = `${tagged.stack}\n    at <island boundary>`;
    const props = this.decode(tagged.props) as Record<string, unknown> | undefined;
    if (props) Object.assign(err, props);
    return err;
  }

  private remember(id: number, proxy: object): void {
    this.importedById.set(id, new WeakRef(proxy));
    this.remoteIdOf.set(proxy, id);
    this.finalizer.register(proxy, id);
  }

  private noteReceived(id: number): void {
    this.importReceived.set(id, (this.importReceived.get(id) ?? 0) + 1);
  }

  private cachedImport(id: number): object | undefined {
    this.noteReceived(id);
    return this.importedById.get(id)?.deref();
  }

  private importFn(id: number, name: string, label: string): unknown {
    const cached = this.cachedImport(id);
    if (cached) return cached;
    const endpoint = this;
    const fn = function (this: unknown, ...args: unknown[]) {
      return endpoint.invoke(id, undefined, this, args, label);
    };
    Object.defineProperty(fn, 'name', { value: name || 'remote' });
    const wrapped = (this.wrapImportedFn?.(fn, label) ?? fn) as object;
    this.remember(id, wrapped);
    if (wrapped !== fn) this.remoteIdOf.set(fn, id);
    return wrapped;
  }

  private importObj(tagged: Record<string, unknown>): unknown {
    const id = tagged.id as number;
    const cached = this.cachedImport(id);
    if (cached) return cached;
    const label = tagged.label as string;
    const endpoint = this;
    const proto: Record<string, unknown> = {};
    // Methods/functions detached from the handle object must keep it alive: the handle's
    // finalizer releases the owner's export entry (distributed GC).
    const holder: { obj?: object } = {};
    for (const method of tagged.methods as string[]) {
      proto[method] = function (this: unknown, ...args: unknown[]) {
        return endpoint.invoke(id, method, holder.obj, args, `${label}.${method}`);
      };
    }
    Object.defineProperty(proto, Symbol.toStringTag, { value: `Remote(${tagged.ctor})` });
    const obj = Object.create(proto) as Record<string, unknown>;
    holder.obj = obj;
    const data = tagged.data as Record<string, Wire>;
    for (const key of Object.keys(data)) obj[key] = this.decode(data[key]);
    for (const key of tagged.fns as string[]) {
      const fn = function (this: unknown, ...args: unknown[]) {
        return endpoint.invoke(id, key, holder.obj, args, `${label}.${key}`);
      };
      obj[key] = this.wrapImportedFn?.(fn, `${label}.${key}`) ?? fn;
    }
    for (const key of tagged.getters as string[]) {
      Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: true,
        get: () => endpoint.remoteGet(id, key, `${label}.${key}`),
      });
    }
    this.remember(id, obj);
    return obj;
  }

  private importDynamic(id: number, label: string): unknown {
    const cached = this.cachedImport(id);
    if (cached) return cached;
    const endpoint = this;
    const proxy = new Proxy(
      {},
      {
        get(_t, prop) {
          if (typeof prop === 'symbol') {
            return prop === Symbol.toStringTag ? `RemoteDynamic(${label})` : undefined;
          }
          if (prop === 'then') return undefined;
          return endpoint.remoteGet(id, prop, `${label}.${prop}`);
        },
        has(_t, prop) {
          if (typeof prop === 'symbol') return false;
          return Boolean(endpoint.remoteOp(id, prop, 'has', `${label}.${prop}`));
        },
        ownKeys() {
          return (endpoint.remoteOp(id, '', 'keys', `${label}.keys`) as string[]) ?? [];
        },
        getOwnPropertyDescriptor(_t, prop) {
          if (typeof prop === 'symbol') return undefined;
          return {
            configurable: true,
            enumerable: true,
            value: endpoint.remoteGet(id, prop, `${label}.${prop}`),
          };
        },
      }
    );
    this.remember(id, proxy);
    return proxy;
  }

  private importPromise(id: number, label: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.pendingSettles.set(id, { resolve, reject, label });
    });
  }

  private importSignal(id: number, aborted: boolean): AbortSignal {
    this.noteReceived(id);
    let controller = this.importedSignals.get(id);
    if (!controller) {
      controller = new AbortController();
      this.importedSignals.set(id, controller);
      if (aborted) controller.abort();
    }
    return controller.signal;
  }

  private importObservable(id: number, label: string): Observable<unknown> {
    const cached = this.cachedImport(id);
    if (cached) return cached as Observable<unknown>;
    const obs = new Observable<unknown>((subscriber) => {
      const sid = this.nextCid++;
      this.subscribers.set(sid, subscriber);
      this.stat(`${label}.subscribe`).out_calls++;
      this.post({ t: 'sub', sid, id });
      return () => {
        this.subscribers.delete(sid);
        this.post({ t: 'unsub', sid });
      };
    });
    this.remember(id, obs);
    return obs;
  }

  private onFinalized(id: number): void {
    const received = this.importReceived.get(id) ?? 0;
    this.importReceived.delete(id);
    this.importedById.delete(id);
    if (received > 0) this.releaseQueue.set(id, received);
    if (!this.releaseTimer) {
      this.releaseTimer = setTimeout(() => {
        this.releaseTimer = undefined;
        const ids = [...this.releaseQueue.entries()];
        this.releaseQueue.clear();
        if (ids.length) this.post({ t: 'release', ids });
      }, 1000);
      this.releaseTimer.unref?.();
    }
  }

  // ---------------------------------------------------------------- calls

  public invoke(
    id: number,
    method: string | undefined,
    self: unknown,
    args: unknown[],
    label: string
  ): unknown {
    const s = this.stat(label);
    s.out_calls++;
    const cid = this.nextCid++;
    const msg: Msg = {
      t: 'call',
      cid,
      id,
      m: method,
      self: method ? undefined : this.encode(self, `${label}(this)`),
      a: args.map((a, i) => this.encode(a, `${label}(arg${i})`)),
      sync: this.side === 'island',
    };
    s.out_bytes += this.sizeOf(msg);
    if (this.side === 'island' && this.transport.callSync) {
      s.out_sync++;
      const t0 = performance.now();
      const reply = this.transport.callSync(msg);
      const waited = performance.now() - t0;
      s.sync_wait_ms += waited;
      if (waited > s.sync_wait_ms_max) s.sync_wait_ms_max = waited;
      return this.handleReturn(reply, label);
    }
    return new Promise((resolve, reject) => {
      this.pending.set(cid, { resolve, reject, label });
      this.post(msg);
    });
  }

  private remoteGet(id: number, prop: string, label: string): unknown {
    return this.remoteOp(id, prop, 'get', label);
  }

  private remoteOp(id: number, prop: string, op: 'get' | 'has' | 'keys', label: string): unknown {
    const s = this.stat(label);
    s.out_calls++;
    if (this.side !== 'island' || !this.transport.callSync) {
      this.breakage(
        'main-sync-get',
        label,
        'main read an accessor owned by the island: main never waits, returned undefined'
      );
      return undefined;
    }
    s.out_sync++;
    const reply = this.transport.callSync({ t: 'get', cid: this.nextCid++, id, p: prop, op });
    return this.handleReturn(reply, label);
  }

  private handleReturn(reply: Msg, label: string): unknown {
    if (reply.pending !== undefined) {
      this.stat(label).out_pending++;
      return this.importPromise(reply.pending as number, label);
    }
    if (reply.ok) return this.decode(reply.v);
    throw this.decode(reply.v);
  }

  private post(msg: Msg): void {
    try {
      this.transport.post(msg);
    } catch (err) {
      this.onSendFailure(msg, err, (fallback) => this.transport.post(fallback));
    }
  }

  private reply(sync: boolean, msg: Msg): void {
    if (!sync) return this.post(msg);
    if (!this.transport.replySync) throw new Error('transport cannot reply synchronously');
    try {
      this.transport.replySync(msg);
    } catch (err) {
      this.onSendFailure(msg, err, (fallback) => this.transport.replySync!(fallback));
    }
  }

  /** A value that cannot cross (e.g. DataCloneError) becomes an error for the caller. */
  private onSendFailure(msg: Msg, err: unknown, send: (fallback: Msg) => void): void {
    const detail = err instanceof Error ? err.message : String(err);
    this.breakage('clone', String(msg.t), detail);
    if (msg.t === 'ret' || msg.t === 'settle') {
      const e = new Error(`island boundary: value could not cross (${detail})`);
      send({ ...msg, ok: false, pending: undefined, v: this.encodeError(e, 'clone') });
    } else if (msg.t === 'call') {
      const p = this.pending.get(msg.cid as number);
      if (p) {
        this.pending.delete(msg.cid as number);
        p.reject(new Error(`island boundary: arguments could not cross (${detail})`));
        return;
      }
      throw err;
    }
  }

  private onMessage(msg: Msg): void {
    switch (msg.t) {
      case 'call':
        return this.onCall(msg);
      case 'get':
        return this.onGet(msg);
      case 'ret': {
        const p = this.pending.get(msg.cid as number);
        if (!p) return;
        this.pending.delete(msg.cid as number);
        if (msg.ok) p.resolve(this.decode(msg.v));
        else p.reject(this.decode(msg.v));
        return;
      }
      case 'settle': {
        const p = this.pendingSettles.get(msg.pid as number);
        if (!p) return;
        this.pendingSettles.delete(msg.pid as number);
        if (msg.ok) p.resolve(this.decode(msg.v));
        else p.reject(this.decode(msg.v));
        return;
      }
      case 'sub': {
        const entry = this.exports.get(msg.id as number);
        const sid = msg.sid as number;
        if (!entry) return;
        const label = entry.label;
        this.stat(`${label}.subscribe`).in_calls++;
        const sub = (entry.value as Observable<unknown>).subscribe({
          next: (v) => this.post({ t: 'next', sid, v: this.encode(v, `${label}.next`) }),
          error: (e) => this.post({ t: 'oerr', sid, v: this.encodeError(e, label) }),
          complete: () => this.post({ t: 'done', sid }),
        });
        this.subscriptions.set(sid, sub);
        return;
      }
      case 'unsub': {
        this.subscriptions.get(msg.sid as number)?.unsubscribe();
        this.subscriptions.delete(msg.sid as number);
        return;
      }
      case 'next':
        this.subscribers.get(msg.sid as number)?.next(this.decode(msg.v));
        return;
      case 'oerr':
        this.subscribers.get(msg.sid as number)?.error(this.decode(msg.v));
        return;
      case 'done':
        this.subscribers.get(msg.sid as number)?.complete();
        return;
      case 'abort':
        this.importedSignals.get(msg.id as number)?.abort(msg.reason);
        return;
      case 'release':
        for (const [id, count] of msg.ids as Array<[number, number]>) {
          const entry = this.exports.get(id);
          if (!entry) continue;
          entry.sends -= count;
          if (entry.sends <= 0) {
            this.exports.delete(id);
            if (entry.value && typeof entry.value === 'object') {
              this.exportIds.delete(entry.value as object);
            } else if (typeof entry.value === 'function') {
              this.exportIds.delete(entry.value as object);
            }
          }
        }
        return;
      default:
        this.onControl?.(msg);
    }
  }

  public onControl?: (msg: Msg) => void;

  private onGet(msg: Msg): void {
    const entry = this.exports.get(msg.id as number);
    const sync = true;
    if (!entry) {
      return this.reply(sync, {
        t: 'ret',
        cid: msg.cid,
        ok: false,
        v: this.encodeError(new Error(`unknown handle ${msg.id}`), 'get'),
      });
    }
    const label = `${entry.label}.${String(msg.p)}`;
    const s = this.stat(label);
    s.in_calls++;
    try {
      const target = entry.value as Record<string, unknown>;
      const prop = msg.p as string;
      const value =
        msg.op === 'has' ? prop in target : msg.op === 'keys' ? Object.keys(target) : target[prop];
      this.reply(sync, { t: 'ret', cid: msg.cid, ok: true, v: this.encode(value, label) });
    } catch (err) {
      s.in_errors++;
      this.reply(sync, { t: 'ret', cid: msg.cid, ok: false, v: this.encodeError(err, label) });
    }
  }

  private onCall(msg: Msg): void {
    const sync = Boolean(msg.sync);
    const entry = this.exports.get(msg.id as number);
    if (!entry) {
      this.reply(sync, {
        t: 'ret',
        cid: msg.cid,
        ok: false,
        v: this.encodeError(new Error(`unknown handle ${msg.id}`), 'call'),
      });
      return;
    }
    const method = msg.m as string | undefined;
    const label = method ? `${entry.label}.${method}` : entry.label;
    const s = this.stat(label);
    s.in_calls++;
    s.in_bytes += this.sizeOf(msg);
    const t0 = performance.now();
    let result: unknown;
    try {
      const args = (msg.a as Wire[]).map((a) => this.decode(a));
      if (method) {
        const target = entry.value as Record<string, (...a: unknown[]) => unknown>;
        const fn = target[method];
        if (typeof fn !== 'function') throw new TypeError(`${label} is not a function`);
        result = fn.apply(target, args);
      } else {
        const self = this.decode(msg.self);
        result = (entry.value as (...a: unknown[]) => unknown).apply(self, args);
      }
    } catch (err) {
      s.in_errors++;
      this.account(s, t0);
      this.reply(sync, { t: 'ret', cid: msg.cid, ok: false, v: this.encodeError(err, label) });
      return;
    }
    this.account(s, t0);
    if (isThenable(result)) {
      if (sync) {
        const pid = this.exportValue(result as object, label);
        this.reply(true, { t: 'ret', cid: msg.cid, pending: pid });
        this.settleLater(pid, result as PromiseLike<unknown>, label, s);
        return;
      }
      (result as PromiseLike<unknown>).then(
        (value) => {
          const out: Msg = { t: 'ret', cid: msg.cid, ok: true, v: this.encode(value, label) };
          s.ret_bytes += this.sizeOf(out);
          this.post(out);
        },
        (err) => {
          s.in_errors++;
          this.post({ t: 'ret', cid: msg.cid, ok: false, v: this.encodeError(err, label) });
        }
      );
      return;
    }
    let encoded: Wire;
    try {
      encoded = this.encode(result, label);
    } catch (err) {
      this.reply(sync, { t: 'ret', cid: msg.cid, ok: false, v: this.encodeError(err, label) });
      return;
    }
    const out: Msg = { t: 'ret', cid: msg.cid, ok: true, v: encoded };
    s.ret_bytes += this.sizeOf(out);
    this.reply(sync, out);
  }

  /** Sends the settlement of an exported promise, then drops its export entry. */
  private settleLater(pid: number, promise: PromiseLike<unknown>, label: string, s?: EdgeStat) {
    const done = () => {
      this.exports.delete(pid);
      this.exportIds.delete(promise as object);
    };
    promise.then(
      (value) => {
        done();
        const out: Msg = { t: 'settle', pid, ok: true, v: this.encode(value, label) };
        if (s) s.ret_bytes += this.sizeOf(out);
        this.post(out);
      },
      (err) => {
        done();
        if (s) s.in_errors++;
        this.post({ t: 'settle', pid, ok: false, v: this.encodeError(err, label) });
      }
    );
  }

  private account(s: EdgeStat, t0: number): void {
    const ms = performance.now() - t0;
    s.in_ms += ms;
    if (ms > s.in_ms_max) s.in_ms_max = ms;
  }

  /** Imports the peer's root (bootstrap) object. */
  public importRoot(methods: string[], label: string): Record<string, (...a: unknown[]) => unknown> {
    return this.importObj({
      id: 0,
      ctor: 'Root',
      data: {},
      fns: [],
      methods,
      getters: [],
      label,
    }) as Record<string, (...a: unknown[]) => unknown>;
  }
}
