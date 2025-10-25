/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transform } from '@babel/core';
import { runInNewContext } from 'vm';
import lazyRequirePlugin from './lazy_require_plugin';

describe('@kbn/babel-plugin-lazy-require', () => {
  interface TestContext {
    module: { exports: any };
    require: (id: string) => any;
    __requireLog: Array<{ path: string }>;
    console: typeof console;
  }

  function createContext(modules: Record<string, any> = {}): TestContext {
    const ctx: TestContext = {
      module: { exports: {} },
      __requireLog: [],
      console,
      require: (id: string) => {
        ctx.__requireLog.push({ path: id });
        if (!modules[id]) throw new Error(`Module not found: ${id}`);
        return typeof modules[id] === 'function' ? modules[id]() : modules[id];
      },
    };
    return ctx;
  }

  function transformCode(code: string, filename = 'test.js'): string {
    const plugins: any[] = [lazyRequirePlugin];
    // Add JSX support if the code contains JSX
    if (code.includes('<') && code.includes('>')) {
      plugins.unshift('@babel/plugin-syntax-jsx');
    }
    const result = transform(code, { plugins, filename });
    return result?.code || '';
  }

  function runCode(code: string, ctx: TestContext): void {
    runInNewContext(transformCode(code), ctx);
  }

  describe('lazy loading', () => {
    it('defers require until first access and caches result', () => {
      const ctx = createContext({ './foo': { value: 42 } });
      runCode('const foo = require("./foo"); module.exports = () => foo;', ctx);

      expect(ctx.__requireLog).toHaveLength(0);
      const result = ctx.module.exports();
      expect(ctx.__requireLog).toHaveLength(1);
      expect(result.value).toBe(42);

      // Subsequent access uses cache
      ctx.module.exports();
      ctx.module.exports();
      expect(ctx.__requireLog).toHaveLength(1);
    });

    it('never loads unused modules', () => {
      const ctx = createContext({ './foo': {}, './bar': {} });
      runCode(
        'const foo = require("./foo"); const bar = require("./bar"); module.exports = () => bar;',
        ctx
      );

      ctx.module.exports();
      expect(ctx.__requireLog).toHaveLength(1);
      expect(ctx.__requireLog[0].path).toBe('./bar');
    });

    it('loads multiple modules independently', () => {
      const ctx = createContext({ './a': { val: 'A' }, './b': { val: 'B' } });
      runCode(
        'const a = require("./a"); const b = require("./b"); module.exports = { a: () => a, b: () => b };',
        ctx
      );

      expect(ctx.module.exports.a().val).toBe('A');
      expect(ctx.__requireLog).toHaveLength(1);
      expect(ctx.module.exports.b().val).toBe('B');
      expect(ctx.__requireLog).toHaveLength(2);
    });
  });

  describe('destructuring', () => {
    it('shares module cache across destructured properties', () => {
      const ctx = createContext({ './utils': { foo: 'FOO', bar: 'BAR' } });
      runCode(
        'const { foo, bar } = require("./utils"); module.exports = { getFoo: () => foo, getBar: () => bar };',
        ctx
      );

      expect(ctx.module.exports.getFoo()).toBe('FOO');
      expect(ctx.__requireLog).toHaveLength(1);
      expect(ctx.module.exports.getBar()).toBe('BAR');
      expect(ctx.__requireLog).toHaveLength(1); // Still 1 - module not reloaded
    });

    it('handles renamed properties and mixed imports', () => {
      const ctx = createContext({ './m': { x: 1, y: 2 } });
      runCode(
        'const { x: a, y: b } = require("./m"); const m = require("./m"); module.exports = { a, b, m: () => m };',
        ctx
      );

      expect(ctx.module.exports.a).toBe(1);
      expect(ctx.module.exports.b).toBe(2);
      expect(ctx.module.exports.m()).toEqual({ x: 1, y: 2 });
      expect(ctx.__requireLog).toHaveLength(1); // All share cache
    });
  });

  describe('variable declarations', () => {
    it.each(['const', 'let', 'var'])('transforms %s declarations', (kind) => {
      const code = transformCode(`${kind} foo = require('./foo');`);
      expect(code).toContain('get foo()');
      if (kind === 'const') {
        expect(code).not.toContain('set foo(');
      } else {
        expect(code).toContain('set foo(');
      }
    });

    it('allows let/var reassignment and loads module for side effects', () => {
      let sideEffect = false;
      const ctx = createContext({
        './m': () => {
          sideEffect = true;
          return { v: 1 };
        },
      });
      runCode('let m = require("./m"); m = { v: 2 }; module.exports = m;', ctx);

      expect(sideEffect).toBe(true);
      expect(ctx.module.exports).toEqual({ v: 2 });
    });
  });

  describe('exclusions', () => {
    it.each([
      ['dynamic require', 'const m = require(path);', 'require(path)'],
      ['side-effect require', 'require("./s");', 'require("./s")'],
      ['function-scoped require', 'function f() { const m = require("./m"); }', 'require("./m")'],
      ['complex destructuring', 'const { a: { b } } = require("./m");', 'require("./m")'],
      ['array destructuring', 'const [a] = require("./m");', 'require("./m")'],
      ['rest pattern', 'const { a, ...rest } = require("./m");', 'require("./m")'],
      ['computed property', 'const { [k]: v } = require("./m");', 'require("./m")'],
    ])('does not transform %s', (_, code, expected) => {
      const result = transformCode(code);
      expect(result).toContain(expected);
      expect(result).not.toContain('_imports');
    });
  });

  describe('scope handling', () => {
    it('handles variable shadowing', () => {
      const ctx = createContext({ './m': { v: 'module' } });
      runCode(
        'const m = require("./m"); function f(m) { return m; } module.exports = { outer: () => m, inner: f };',
        ctx
      );

      expect(ctx.module.exports.inner('param')).toBe('param');
      expect(ctx.__requireLog).toHaveLength(0); // Not loaded yet
      expect(ctx.module.exports.outer().v).toBe('module');
      expect(ctx.__requireLog).toHaveLength(1);
    });

    it('works in nested scopes', () => {
      const ctx = createContext({ './m': { v: 'x' } });
      runCode('const m = require("./m"); module.exports = () => () => () => m.v;', ctx);

      expect(ctx.module.exports()()()).toBe('x');
    });
  });

  describe('property access patterns', () => {
    it('works with various access patterns', () => {
      const ctx = createContext({
        './m': {
          deep: { nested: 'val' },
          key: 'dynamic',
          fn: (x: number) => x * 2,
        },
      });
      runCode(
        `const m = require('./m');
         const k = 'key';
         module.exports = {
           member: m.deep.nested,
           computed: m[k],
           call: m.fn(21),
           spread: { ...m },
         };`,
        ctx
      );

      expect(ctx.module.exports.member).toBe('val');
      expect(ctx.module.exports.computed).toBe('dynamic');
      expect(ctx.module.exports.call).toBe(42);
      expect(ctx.module.exports.spread.key).toBe('dynamic');
      expect(ctx.__requireLog).toHaveLength(1);
    });
  });

  describe('module paths', () => {
    it.each([
      ['relative', './local', { type: 'relative' }],
      ['parent', '../parent', { type: 'parent' }],
      ['package', 'lodash', { name: 'lodash' }],
      ['scoped', '@kbn/utils', { scoped: true }],
      ['deep', 'pkg/dist/sub', { deep: true }],
    ])('works with %s paths', (_, path, expected) => {
      const ctx = createContext({ [path]: expected });
      runCode(`const m = require('${path}'); module.exports = m;`, ctx);
      expect(ctx.module.exports).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('handles empty files and files without requires', () => {
      expect(transformCode('')).toBe('');
      expect(transformCode('const x = 1;')).not.toContain('_imports');
    });

    it('handles multiple requires in one statement', () => {
      const ctx = createContext({ './a': { v: 1 }, './b': { v: 2 } });
      runCode(
        'const a = require("./a"), b = require("./b"); module.exports = { a: () => a, b: () => b };',
        ctx
      );

      expect(ctx.module.exports.a().v).toBe(1);
      expect(ctx.module.exports.b().v).toBe(2);
    });

    it('preserves require order independence', () => {
      const order: string[] = [];
      const ctx = createContext({
        './a': () => {
          order.push('a');
          return {};
        },
        './b': () => {
          order.push('b');
          return {};
        },
      });
      runCode(
        'const b = require("./b"), a = require("./a"); module.exports = { a: () => a, b: () => b };',
        ctx
      );

      ctx.module.exports.a();
      expect(order).toEqual(['a']);
      ctx.module.exports.b();
      expect(order).toEqual(['a', 'b']);
    });
  });

  describe('code generation', () => {
    it('generates proper structure', () => {
      const code = transformCode('const a = require("./a"); const b = require("./b");');

      expect(code.match(/const _module\d* = \{/g)).toHaveLength(2);
      expect(code).toMatch(/const _imports\d* = \{/);

      const moduleIdx = code.indexOf('_module');
      const consoleIdx = code.indexOf('console');
      if (consoleIdx !== -1) expect(moduleIdx).toBeLessThan(consoleIdx);
    });
  });

  describe('ES6 import statements', () => {
    it('transforms default imports', () => {
      const code = transformCode(`
        import foo from './bar';
        console.log(foo);
      `);

      expect(code).toContain('_interopRequireDefault');
      expect(code).toContain('get foo()');
      expect(code).toContain('_interopRequireDefault(require("./bar"))');
      expect(code).toContain('return _module.value.default');
    });

    it('transforms named imports', () => {
      const code = transformCode(`
        import { foo, bar } from './utils';
        console.log(foo, bar);
      `);

      expect(code).toContain('get foo()');
      expect(code).toContain('get bar()');
      expect(code).toContain('require("./utils")');
      expect(code).toContain('_module.value.foo');
      expect(code).toContain('_module.value.bar');
    });

    it('transforms namespace imports', () => {
      const code = transformCode(`
        import * as utils from './utils';
        console.log(utils);
      `);

      expect(code).toContain('get utils()');
      expect(code).toContain('require("./utils")');
      expect(code).toContain('return _module.value');
      expect(code).not.toContain('_interopRequireDefault');
    });

    it('shares module cache for named imports from same module', () => {
      const code = transformCode(`
        import { foo, bar } from './utils';
        console.log(foo, bar);
      `);

      const moduleCaches = code.match(/const _module\d* = \{/g);
      expect(moduleCaches).toHaveLength(1);
      expect(code.split('require("./utils")').length).toBe(3); // 2 getters + 1 definition
    });

    it('handles mixed import types', () => {
      const code = transformCode(`
        import React from 'react';
        import { useState } from 'react';
        import * as ReactDOM from 'react-dom';
        console.log(React, useState, ReactDOM);
      `);

      expect(code).toContain('_interopRequireDefault');
      expect(code).toContain('get React()');
      expect(code).toContain('get useState()');
      expect(code).toContain('get ReactDOM()');
    });

    it('lazy loads default imports', () => {
      const loadLog: string[] = [];
      const code = `
        import foo from './delayed-module';
        loadLog.push('start');
        foo.doSomething();
        loadLog.push('end');
      `;

      const transformed = transformCode(code);
      const context = {
        loadLog,
        console,
        require: (path: string) => {
          if (path === '@babel/runtime/helpers/interopRequireDefault') {
            return (obj: any) => (obj && obj.__esModule ? obj : { default: obj });
          }
          if (path === './delayed-module') {
            loadLog.push('loaded');
            return { __esModule: true, default: { doSomething: () => {} } };
          }
          throw new Error(`Unexpected require: ${path}`);
        },
      };

      runInNewContext(transformed, context);
      expect(loadLog).toEqual(['start', 'loaded', 'end']);
    });
  });

  describe('module-level usage exclusion', () => {
    it('does not transform imports used in module-level variable declarations', () => {
      const code = transformCode(`
        import { foo } from './utils';
        const x = foo;
      `);

      expect(code).toMatch(/import\s+\{/); // Import statement kept
      expect(code).toContain('foo');
      expect(code).not.toContain('_imports');
    });

    it('does not transform requires used in module-level function calls', () => {
      const code = transformCode(`
        const Path = require('path');
        const findRoot = () => Path.parse(__dirname);
        const { root } = findRoot();
      `);

      expect(code).toContain('const Path = require');
      expect(code).toContain('Path.parse');
      expect(code).not.toContain('_imports');
    });

    it('partially transforms imports when some used at module-level', () => {
      const code = transformCode(`
        import { EuiCode, EuiButton } from '@elastic/eui';
        const directive = <EuiCode>test</EuiCode>;
        function Component() {
          return <EuiButton />;
        }
      `);

      // EuiCode should be kept as import (used in module-level const)
      expect(code).toContain('EuiCode');
      expect(code).not.toContain('get EuiCode');

      // EuiButton should be lazy (used in function)
      expect(code).toContain('get EuiButton');
    });

    it('transforms imports used only in functions', () => {
      const code = transformCode(`
        import { foo } from './utils';
        function test() {
          return foo;
        }
      `);

      expect(code).toContain('get foo');
      expect(code).not.toMatch(/import\s+\{/); // No import statement
    });
  });
});
