/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Babel from '@babel/core';
import { runInNewContext } from 'vm';
import {
  createLazyObjectFromAnnotations,
  annotateLazy,
} from '../create_lazy_object_from_annotations';

function transform(code: string) {
  // Use Kibana's node preset which includes the lazy plugin and converts ESM to CJS
  const result = Babel.transformSync(code, {
    presets: ['@kbn/babel-preset/node_preset'],
    filename: 'test.js',
  });
  if (!result || !result.code) throw new Error('Transform failed');
  return result.code;
}

type Context<T extends Record<string, any> | undefined> = {
  __hits: number;
  module: { exports: {} };
  exports: {};
  lazyObject: typeof lazyObject;
  require: (id: string) => typeof import('../../index');
  globalThis: Context<T>;
} & T;

function createContext<T extends Record<string, any> | undefined>(init?: T): Context<T>;
function createContext(init?: Record<string, any>) {
  const ctx = {
    __hits: 0,
    module: { exports: {} },
    exports: {},
    lazyObject,
    require: (id: string) => {
      if (id === '@kbn/lazy-object') {
        return {
          createLazyObjectFromAnnotations,
          annotateLazy,
          lazyObject: (x: any) => x,
        };
      }
      throw new Error(`Unknown module: ${id}`);
    },
    get globalThis(): Context<any> {
      return ctx;
    },
    ...init,
  };
  return ctx;
}

// Minimal runtime shim for the "macro" marker
function lazyObject<T extends object>(obj: T): T {
  return obj;
}

describe('lazyBabelPlugin', () => {
  it('wraps properties in lazy getters and memoizes on first access', () => {
    const code = transform(`
      import { lazyObject } from '@kbn/lazy-object';

      const o = lazyObject({
        a: (() => { globalThis.__hits = (globalThis.__hits||0)+1; return 1; })(),
      });
      o;
    `);

    // Execute transformed code in isolated context
    const ctx = createContext();

    runInNewContext(code + '\nmodule.exports = o;', ctx);
    const o: any = ctx.module.exports;

    expect(ctx.__hits).toBe(0); // not executed yet
    expect(o.a).toBe(1); // first access executes
    expect(ctx.__hits).toBe(1);
    expect(o.a).toBe(1); // second access memoized
    expect(ctx.__hits).toBe(1);
  });

  it('allows setting property to override memoized value', () => {
    const code = transform(`
      import { lazyObject } from '@kbn/lazy-object';
      
      const o = lazyObject({
        x: (() => { globalThis.__hits = (globalThis.__hits||0)+1; return 5; })(),
      });
      o;
    `);

    const ctx = createContext();

    runInNewContext(code + '\nmodule.exports = o;', ctx);
    const o: any = ctx.module.exports;

    o.x = 9;
    expect(o.x).toBe(9);
    expect(ctx.__hits).toBe(0); // setter should not trigger original evaluation
  });

  it('only transforms lazyObject calls from @kbn/lazy-object', () => {
    const code = transform(`
      import { lazyObject } from '@kbn/not-lazy-object';
      const o = lazyObject({ a: 1, b: 2 });
      o;
    `);

    expect(code).not.toContain('_lazyObject.');
  });

  it('keeps properties enumerable', () => {
    const code = transform(`
      import { lazyObject } from '@kbn/lazy-object';
      const o = lazyObject({ a: 1, b: 2 });
      o;
    `);
    const ctx = createContext();

    runInNewContext(code + '\nmodule.exports = o;', ctx);
    const o: any = ctx.module.exports;
    expect(Object.keys(o)).toEqual(['a', 'b']);
  });

  it('handles spread properties without crashing', () => {
    const code = transform(`
      import { lazyObject } from '@kbn/lazy-object';
      const base = { a: 1 };
      const o = lazyObject({ ...base, b: (() => { globalThis.__hits = (globalThis.__hits||0)+1; return 2; })() });
      o;
    `);

    const ctx = createContext();

    runInNewContext(code + '\nmodule.exports = o;', ctx);
    const o: any = ctx.module.exports;

    expect(o.a).toBe(1);

    // Should not have executed b yet
    expect(ctx.__hits).toBe(0);
    // Accessing b should evaluate once
    expect(o.b).toBe(2);
    expect(ctx.__hits).toBe(1);
  });

  it('handles spread of call expressions without crashing', () => {
    const code = transform(`
      import { lazyObject } from '@kbn/lazy-object';

      function createCoreMock() {
        globalThis.__spreadHits = (globalThis.__spreadHits||0)+1;
        return { a: 1 };
      }
      const o = lazyObject({
        ...createCoreMock(),
        b: (() => { globalThis.__lazyHits = (globalThis.__lazyHits||0)+1; return 2; })(),
      });
      o;
    `);

    const ctx = createContext({
      __lazyHits: 0,
      __spreadHits: 0,
    });

    runInNewContext(code + '\nmodule.exports = o;', ctx);
    const o: any = ctx.module.exports;

    // Spread of call expression is applied eagerly during construction
    expect(ctx.__spreadHits).toBe(1);
    expect(o.a).toBe(1);

    // Non-spread property remains lazy
    expect(ctx.__lazyHits).toBe(0);
    expect(o.b).toBe(2);
    expect(ctx.__lazyHits).toBe(1);
  });
});
