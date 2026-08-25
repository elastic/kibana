/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazyImmutableGCableObject } from './lazy_immutable_gcable_object';

describe('lazyImmutableGCableObject', () => {
  it('defers factory invocation until first property access', () => {
    const factory = jest.fn(() => ({ value: 1 }));
    const obj = lazyImmutableGCableObject(factory);

    expect(factory).not.toHaveBeenCalled();

    // Access a property to trigger materialization.
    void obj.value;

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('caches the materialized object while it is still reachable', () => {
    const factory = jest.fn(() => ({ value: 1 }));
    const obj = lazyImmutableGCableObject(factory);

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
      const obj = lazyImmutableGCableObject(factory);

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
    const obj = lazyImmutableGCableObject(() => ({
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
    const obj = lazyImmutableGCableObject(() => ({ a: 1, b: 2 }));

    expect('a' in obj).toBe(true);
    expect('missing' in obj).toBe(false);
  });

  it('enumerates own keys of the materialized object', () => {
    const obj = lazyImmutableGCableObject(() => ({ a: 1, b: 2, c: 3 }));

    expect(Object.keys(obj)).toEqual(['a', 'b', 'c']);
    expect(Object.getOwnPropertyNames(obj)).toEqual(['a', 'b', 'c']);

    const collected: string[] = [];

    // eslint-disable-next-line guard-for-in
    for (const key in obj) {
      collected.push(key);
    }

    expect(collected).toEqual(['a', 'b', 'c']);
    expect({ ...obj }).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('exposes property descriptors from the materialized object', () => {
    const obj = lazyImmutableGCableObject(() => ({ value: 42 }));

    const desc = Object.getOwnPropertyDescriptor(obj, 'value');

    expect(desc).toEqual(expect.objectContaining({ value: 42, enumerable: true, writable: true }));
    expect(Object.getOwnPropertyDescriptor(obj, 'missing')).toBeUndefined();
  });

  it('satisfies Proxy invariants for non-configurable properties', () => {
    // `_zod` on Zod schemas is defined non-configurable; emulate that shape
    // to verify our descriptor coercion keeps the Proxy invariant happy.
    const obj = lazyImmutableGCableObject(() => {
      const inst: { _secret?: string } = {};
      Object.defineProperty(inst, '_secret', {
        value: 'hidden',
        enumerable: false,
        configurable: false,
        writable: false,
      });
      return inst;
    });

    expect(() => Object.getOwnPropertyDescriptor(obj, '_secret')).not.toThrow();
    expect((obj as { _secret: string })._secret).toBe('hidden');
  });

  it('throws an error upon setting a prop', () => {
    const obj = lazyImmutableGCableObject(() => ({ value: 1 } as { value: number }));

    expect(() => {
      obj.value = 42;
    }).toThrowError();
  });

  it('throws an error upon defining a prop', () => {
    const obj = lazyImmutableGCableObject(() => ({ value: 1 } as Partial<{ value: number }>));

    expect(() => {
      Object.defineProperty(obj, 'foo', {
        value: 42,
        writable: false,
      });
    }).toThrowError();
  });

  it('throws an error upon deleting a prop', () => {
    const obj = lazyImmutableGCableObject(() => ({ value: 1 } as Partial<{ value: number }>));

    expect(() => {
      delete obj.value;
    }).toThrowError();
  });
});
