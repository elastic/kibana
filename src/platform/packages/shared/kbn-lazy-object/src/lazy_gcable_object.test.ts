/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazyGCableObject } from './lazy_gcable_object';

describe('lazyGCableObject', () => {
  it('defers factory invocation until first property access', () => {
    const factory = jest.fn(() => ({ value: 1 }));
    const obj = lazyGCableObject(factory);

    expect(factory).not.toHaveBeenCalled();

    // Access a property to trigger materialization.
    void obj.value;

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('caches the materialized object while it is still reachable', () => {
    const factory = jest.fn(() => ({ value: 1 }));
    const obj = lazyGCableObject(factory);

    // A single retained reference pins the instance, so all reads reuse it.
    expect(obj.value).toBe(1);
    expect(obj.value).toBe(1);
    expect(obj.value).toBe(1);

    expect(factory).toHaveBeenCalledTimes(1);
  });

  // The materialized object is held via `WeakRef`, so if the GC reclaims it
  // between turns (under memory pressure), the next access rebuilds it from
  // the factory. We verify the rebuild path by simulating cache eviction —
  // V8's heuristics are not deterministic enough to assert collection itself.
  it('rebuilds the object after the WeakRef is cleared', () => {
    const factory = jest.fn(() => ({ value: 1 }));
    const RealWeakRef = globalThis.WeakRef;

    let onlyRef: WeakRef<object> | undefined;

    class EvictableWeakRef<T extends object> {
      private target: T | undefined;
      constructor(target: T) {
        this.target = target;
        onlyRef = this as unknown as WeakRef<object>;
      }
      deref(): T | undefined {
        return this.target;
      }
      evict(): void {
        this.target = undefined;
      }
    }
    (globalThis as { WeakRef: unknown }).WeakRef = EvictableWeakRef;

    try {
      const obj = lazyGCableObject(factory);

      void obj.value;
      expect(factory).toHaveBeenCalledTimes(1);

      // Simulate the GC reclaiming the object.
      (onlyRef as unknown as EvictableWeakRef<object>).evict();

      void obj.value;
      expect(factory).toHaveBeenCalledTimes(2);
    } finally {
      (globalThis as { WeakRef: unknown }).WeakRef = RealWeakRef;
    }
  });

  it('binds function-valued properties to the materialized object', () => {
    const obj = lazyGCableObject(() => ({
      value: 42,
      getValue() {
        return this.value;
      },
    }));

    // Destructuring loses the original `this`; the Proxy must bind the method
    // to the materialized target so the call still resolves correctly.
    const { getValue } = obj;
    expect(getValue()).toBe(42);
    expect(obj.getValue()).toBe(42);
  });

  it('supports the `in` operator via the has trap', () => {
    const obj = lazyGCableObject(() => ({ a: 1, b: 2 }));

    expect('a' in obj).toBe(true);
    expect('missing' in obj).toBe(false);
  });
});
