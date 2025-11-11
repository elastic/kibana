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

  function transformCode(code: string, filename = 'file.js'): string {
    const plugins: Array<string | typeof lazyRequirePlugin> = [lazyRequirePlugin];
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
    it('defers loading until access, caches result, and skips unused modules', () => {
      const ctx = createContext({ './foo': { val: 1 }, './bar': { val: 2 }, './unused': {} });
      runCode(
        'const foo = require("./foo"); const bar = require("./bar"); const unused = require("./unused"); module.exports = { foo: () => foo, bar: () => bar };',
        ctx
      );

      // Nothing loaded yet
      expect(ctx.__requireLog).toHaveLength(0);

      // Access foo - loads only foo
      expect(ctx.module.exports.foo().val).toBe(1);
      expect(ctx.__requireLog).toHaveLength(1);
      expect(ctx.__requireLog[0].path).toBe('./foo');

      // Access foo again - uses cache
      ctx.module.exports.foo();
      expect(ctx.__requireLog).toHaveLength(1);

      // Access bar - loads bar
      expect(ctx.module.exports.bar().val).toBe(2);
      expect(ctx.__requireLog).toHaveLength(2);

      // unused never loaded
      expect(ctx.__requireLog.map((l) => l.path)).not.toContain('./unused');
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

  describe('generated code structure', () => {
    it('creates module caches and imports object in correct order', () => {
      const code = transformCode('const a = require("./a"); const b = require("./b");');

      expect(code.match(/const _module\d* = \{/g)).toHaveLength(2);
      expect(code).toMatch(/const _imports\d* = \{/);

      // Module caches must come before any user code
      const moduleIdx = code.indexOf('_module');
      const consoleIdx = code.indexOf('console');
      if (consoleIdx !== -1) expect(moduleIdx).toBeLessThan(consoleIdx);
    });
  });

  describe('constructor usage exclusion', () => {
    it('keeps eager for constructor flow in non-test files (direct + one-hop)', () => {
      const code = transformCode(
        `
        import { DirectNew, OneHopNew } from './classes';
        export class Service {
          constructor() {
            this.direct = new DirectNew();
            this.setupSystem();
          }
          setupSystem() {
            this.oneHop = new OneHopNew();
          }
        }
      `,
        'component.ts'
      );
      expect(code).toMatch(
        /import\s+\{\s*DirectNew,\s*OneHopNew\s*\}\s+from\s+['"]\.\/classes['"]/
      );
      expect(code).not.toContain('get DirectNew');
      expect(code).not.toContain('get OneHopNew');
    });

    it.each([
      ['default import', 'import Foo from "./cls"', 'Foo', 'new Foo()'],
      ['named import', 'import { Bar } from "./pkg"', 'Bar', 'new Bar()'],
      ['namespace import', 'import * as ns from "./pkg"', 'ns', 'new ns.Foo()'],
      ['require', 'const Cls = require("./cls")', 'Cls', 'new Cls()'],
      ['destructured', 'const { Lexer } = require("./lexer")', 'Lexer', 'new Lexer()'],
    ])('does not transform %s used with new in test files', (type, importCode, varName, usage) => {
      const code = transformCode(
        `
        ${importCode};
        export const fn = () => ${usage};
      `,
        'sample.test.ts'
      );

      expect(code).toContain(varName);
      expect(code).not.toContain(`get ${varName}`);
      expect(code).not.toContain('_imports');
    });

    it('handles deep member new expressions (new ns.sub.Foo())', () => {
      const code = transformCode(
        `
        import * as lib from './lib';
        export const y = () => new lib.sub.Foo();
      `,
        'deep.spec.ts'
      );
      expect(code).toMatch(/import\s+\*\s+as\s+lib\s+from\s+['"]\.\/lib['"]/);
      expect(code).not.toContain('get lib');
      expect(code).not.toContain('_imports');
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
      expect(code).toContain('_module.value = require("./bar")');
      expect(code).toContain('return _interopRequireDefault(_module.value).default');
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

    it('shares cache for mixed default and named imports from same module', () => {
      const loadLog: string[] = [];
      const code = `
        import utils, { helper } from './utils';
        function Component() {
          const result = helper();
          return utils.process(result);
        }
        module.exports = Component;
      `;

      const transformed = transformCode(code);
      const context = {
        module: { exports: null as any },
        console,
        require: (path: string) => {
          if (path === '@babel/runtime/helpers/interopRequireDefault') {
            return (obj: any) => (obj && obj.__esModule ? obj : { default: obj });
          }
          if (path === './utils') {
            loadLog.push('./utils');
            return {
              __esModule: true,
              default: { process: (x: any) => x },
              helper: () => 'result',
            };
          }
          throw new Error(`Unexpected: ${path}`);
        },
      };

      runInNewContext(transformed, context);
      context.module.exports();

      // Critical: module should only load once despite being accessed via default and named
      expect(loadLog).toEqual(['./utils']);

      // Verify both getters use the same module cache
      const moduleCaches = transformed.match(/const _module\d* = \{/g);
      expect(moduleCaches).toHaveLength(1); // Only one cache for both utils and helper
    });
  });

  describe('module-level usage exclusion', () => {
    it('does not transform imports used in module-level variable declarations', () => {
      const code = transformCode(`
        import { foo } from './utils';
        const x = foo;
      `);

      expect(code).toMatch(/import\s+\{/);
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

    it('transforms imports used only in functions', () => {
      const code = transformCode(`
        import { foo } from './utils';
        function test() {
          return foo;
        }
      `);

      expect(code).toContain('get foo');
      expect(code).not.toMatch(/import\s+\{/);
    });

    it('does not transform imports used in class static properties', () => {
      const code = transformCode(`
        import { DFA, Other } from 'antlr4';
        export default class MyLexer {
          static decisions = items.map(x => new DFA(x));
          method() {
            return new Other();
          }
        }
      `);

      // DFA kept (used in static property)
      expect(code).toContain('DFA');
      expect(code).not.toContain('get DFA');

      // Other lazy (used in method)
      expect(code).toContain('get Other');
    });
  });

  describe('Module exclusion', () => {
    it('never transforms excluded modules (@jest/globals, @testing-library/* wildcard)', () => {
      const code = transformCode(`
        import { describe, test } from '@jest/globals';
        import { render, screen } from '@testing-library/react';
        import { helper } from './utils';

        describe('suite', () => {
          test('case', () => {
            render(<div>test</div>);
            helper();
          });
        });
      `);

      // Excluded modules - not transformed
      expect(code).toContain('describe');
      expect(code).toContain('test');
      expect(code).toContain('render');
      expect(code).toContain('screen');
      expect(code).not.toContain('get describe');
      expect(code).not.toContain('get test');
      expect(code).not.toContain('get render');
      expect(code).not.toContain('get screen');

      // Non-excluded module - transformed
      expect(code).toContain('get helper');
    });

    it('supports wildcard patterns in module exclusions', () => {
      const code = transformCode(`
        import { something } from '@testing-library/user-event';
        import { other } from '@other-library/module';
      `);

      // @testing-library/* excluded by wildcard
      expect(code).toContain('@testing-library/user-event');
      expect(code).not.toContain('get something');

      // @other-library/* not excluded - transformed
      expect(code).toContain('get other');
    });
  });

  describe('jest.mock() factory handling', () => {
    it('does not transform imports used in jest.mock() factory functions', () => {
      const code = transformCode(`
        import { mockHelper } from './test_utils';
        import { regularHelper } from './utils';

        jest.mock('./module', () => ({
          fn: () => mockHelper()
        }));

        function test() {
          return regularHelper();
        }
      `);

      // mockHelper used in jest.mock() - not transformed
      expect(code).toContain('mockHelper');
      expect(code).not.toContain('get mockHelper');

      // regularHelper not used in mock - should be transformed
      expect(code).toContain('get regularHelper');
    });

    it('does not transform imports used in jest.doMock() factory functions', () => {
      const code = transformCode(`
        import { mockData } from './fixtures';

        jest.doMock('./module', () => mockData);

        function test() {
          return mockData;
        }
      `);

      // mockData used in jest.doMock() - not transformed
      expect(code).toContain('mockData');
      expect(code).not.toContain('get mockData');
      expect(code).not.toContain('_imports');
    });

    it('handles complex jest.mock() factories with multiple imports', () => {
      const code = transformCode(`
        import { mock1, mock2 } from './mocks';
        import { util1, util2 } from './utils';

        jest.mock('./module', () => {
          return {
            method1: () => mock1(),
            method2: () => mock2()
          };
        });

        function test() {
          util1();
          util2();
        }
      `);

      // mock1 and mock2 used in factory - not transformed
      expect(code).toContain('mock1');
      expect(code).toContain('mock2');
      expect(code).not.toContain('get mock1');
      expect(code).not.toContain('get mock2');

      // util1 and util2 not in factory - transformed
      expect(code).toContain('get util1');
      expect(code).toContain('get util2');
    });
  });

  describe('JSX and React handling', () => {
    it.each([
      ['default', 'import React from "react"', 'React', 'React.createElement'],
      ['named', 'import { useState, useEffect } from "react"', 'useState', 'useState(0)'],
      ['namespace', 'import * as React from "react"', 'React', 'React.createElement'],
    ])('never transforms React %s imports', (type, importCode, varName, usage) => {
      const code = transformCode(`
        ${importCode};
        function test() { ${usage}; }
      `);

      expect(code).toContain(varName);
      expect(code).not.toContain(`get ${varName}`);
      expect(code).not.toContain('_imports');
    });

    it('does not transform components used in JSX (nested, self-closing, fragments)', () => {
      const code = transformCode(`
        import { Panel, Header, Body, Spinner } from './components';
        export default () => (
          <>
            <Panel>
              <Header title="Test" />
              <Body><p>Content</p></Body>
            </Panel>
            <Spinner />
          </>
        );
      `);

      ['Panel', 'Header', 'Body', 'Spinner'].forEach((comp) => {
        expect(code).toContain(comp);
        expect(code).not.toContain(`get ${comp}`);
      });
      expect(code).not.toContain('_imports');
    });

    it('does not transform JSX member expressions (Context.Provider, nested patterns)', () => {
      const code = transformCode(`
        import { MyContext, Theme } from './components';
        import { helper } from './utils';
        export default () => (
          <MyContext.Provider value={{}}>
            <Theme.Dark.Container>
              {helper()}
            </Theme.Dark.Container>
          </MyContext.Provider>
        );
      `);

      // JSX member expression roots - not transformed
      expect(code).toContain('MyContext');
      expect(code).toContain('Theme');
      expect(code).not.toContain('get MyContext');
      expect(code).not.toContain('get Theme');

      // Non-JSX import - transformed
      expect(code).toContain('get helper');
    });

    it('transforms non-JSX imports even when file contains JSX', () => {
      const code = transformCode(`
        import { Button } from '@elastic/eui';
        import { processData } from './utils';
        function Component() {
          const data = processData();
          return <Button>{data}</Button>;
        }
      `);

      expect(code).toContain('Button');
      expect(code).not.toContain('get Button');
      expect(code).toContain('get processData');
    });
  });
});
