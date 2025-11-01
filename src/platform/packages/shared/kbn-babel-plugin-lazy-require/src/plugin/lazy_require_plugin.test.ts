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

    it('does not transform mock files (*.mock.ts, *.mocks.ts)', () => {
      const code = 'import { something } from "./module"; export const mockValue = something;';

      // Transform with mock filename
      const result = transform(code, {
        plugins: [lazyRequirePlugin],
        filename: 'test.mock.ts',
      });

      // Should not be transformed
      expect(result?.code).toContain('import');
      expect(result?.code).not.toContain('_imports');
    });

    it('does not transform imports from .test.mocks files (jest.doMock setup needs immediate access)', () => {
      const code = `
        import { MockService, mockHelper } from './service.test.mocks';
        import { realModule } from './real_module';

        test('example', () => {
          expect(MockService).toBeDefined();
          expect(realModule).toBeDefined();
        });
      `;

      const result = transformCode(code);

      // Imports from .test.mocks should NOT be lazy
      expect(result).toContain('MockService');
      expect(result).toContain('mockHelper');
      expect(result).not.toContain('get MockService');
      expect(result).not.toContain('get mockHelper');

      // But other imports should be lazy
      expect(result).toContain('get realModule');
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

    it('does not transform imports used in JSX (components need direct access for JSX transform)', () => {
      const code = transformCode(`
        import { EuiCode, EuiButton } from '@elastic/eui';
        const directive = <EuiCode>test</EuiCode>;
        function Component() {
          return <EuiButton />;
        }
      `);

      // Both components should be kept as imports (both used in JSX)
      expect(code).toContain('EuiCode');
      expect(code).toContain('EuiButton');
      expect(code).not.toContain('get EuiCode');
      expect(code).not.toContain('get EuiButton');
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
      expect(code).not.toMatch(/import\s+\{/); // No import statement
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
    it('never transforms imports from excluded modules (@jest/globals)', () => {
      const code = transformCode(`
        import { describe, test, expect } from '@jest/globals';
        describe('test suite', () => {
          test('test case', () => {
            expect(true).toBe(true);
          });
        });
      `);

      // Jest globals should not be transformed
      expect(code).toContain('describe');
      expect(code).toContain('test');
      expect(code).toContain('expect');
      expect(code).not.toContain('get describe');
      expect(code).not.toContain('get test');
      expect(code).not.toContain('get expect');
      expect(code).not.toContain('_imports');
    });

    it('transforms non-excluded imports even when excluded modules are present', () => {
      const code = transformCode(`
        import { describe, test } from '@jest/globals';
        import { helper } from './utils';
        describe('test', () => {
          test('case', () => {
            helper();
          });
        });
      `);

      // Jest globals not transformed
      expect(code).toContain('describe');
      expect(code).toContain('test');
      expect(code).not.toContain('get describe');
      expect(code).not.toContain('get test');

      // But helper should be transformed
      expect(code).toContain('get helper');
    });

    it('never transforms @testing-library/* modules (wildcard pattern)', () => {
      const code = transformCode(`
        import { render, screen } from '@testing-library/react';
        import userEvent from '@testing-library/user-event';
        import '@testing-library/jest-dom';
        import { helper } from './utils';

        test('example', async () => {
          render(<div>test</div>);
          await userEvent.click(screen.getByText('test'));
          helper();
        });
      `);

      // Testing library imports not transformed (matched by '@testing-library/*' wildcard)
      expect(code).toContain('render');
      expect(code).toContain('screen');
      expect(code).toContain('userEvent');
      expect(code).not.toContain('get render');
      expect(code).not.toContain('get screen');
      expect(code).not.toContain('get userEvent');

      // But helper should be transformed
      expect(code).toContain('get helper');
    });

    it('supports wildcard patterns in module exclusions', () => {
      // Test that * wildcards work correctly
      const code1 = transformCode(`
        import { something } from '@testing-library/user-event';
        import { other } from '@other-library/module';
      `);

      // @testing-library/* should be excluded
      expect(code1).toContain('@testing-library/user-event');
      expect(code1).not.toContain('get something');

      // @other-library/* should be transformed (not in exclusion list)
      expect(code1).toContain('get other');
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
    it('never transforms React imports (always needed for JSX runtime)', () => {
      const code = transformCode(`
        import React from 'react';
        function Component() {
          return React.createElement('div', null, 'test');
        }
      `);

      expect(code).toContain('React');
      expect(code).not.toContain('get React');
      expect(code).not.toContain('_imports');
    });

    it('never transforms React named imports', () => {
      const code = transformCode(`
        import { useState, useEffect } from 'react';
        function useCustomHook() {
          const [state] = useState(0);
          useEffect(() => {}, []);
        }
      `);

      expect(code).toContain('useState');
      expect(code).toContain('useEffect');
      expect(code).not.toContain('get useState');
      expect(code).not.toContain('get useEffect');
      expect(code).not.toContain('_imports');
    });

    it('never transforms React namespace imports', () => {
      const code = transformCode(`
        import * as React from 'react';
        function Component() {
          return React.createElement('div');
        }
      `);

      expect(code).toContain('React');
      expect(code).not.toContain('get React');
      expect(code).not.toContain('_imports');
    });

    it('does not transform components used in JSX syntax', () => {
      const code = transformCode(`
        import { Button, Icon } from '@elastic/eui';
        function MyComponent() {
          return (
            <Button>
              <Icon type="check" />
            </Button>
          );
        }
      `);

      expect(code).toContain('Button');
      expect(code).toContain('Icon');
      expect(code).not.toContain('get Button');
      expect(code).not.toContain('get Icon');
      expect(code).not.toContain('_imports');
    });

    it('does not transform components in self-closing JSX tags', () => {
      const code = transformCode(`
        import { Spinner } from './components';
        const Loading = () => <Spinner />;
      `);

      expect(code).toContain('Spinner');
      expect(code).not.toContain('get Spinner');
      expect(code).not.toContain('_imports');
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

      // Button used in JSX - not transformed
      expect(code).toContain('Button');
      expect(code).not.toContain('get Button');

      // processData not used in JSX - transformed
      expect(code).toContain('get processData');
    });

    it('handles mixed React default and named imports', () => {
      const code = transformCode(`
        import React, { useState, useCallback } from 'react';
        function Component() {
          const [count, setCount] = useState(0);
          const increment = useCallback(() => setCount(c => c + 1), []);
          return React.createElement('div', { onClick: increment }, count);
        }
      `);

      // All React imports should be kept
      expect(code).toContain('React');
      expect(code).toContain('useState');
      expect(code).toContain('useCallback');
      expect(code).not.toContain('get React');
      expect(code).not.toContain('get useState');
      expect(code).not.toContain('get useCallback');
      expect(code).not.toContain('_imports');
    });

    it('does not transform JSX components used in nested elements', () => {
      const code = transformCode(`
        import { Panel, Header, Body, Footer } from './components';
        export default () => (
          <Panel>
            <Header title="Test" />
            <Body>
              <p>Content</p>
            </Body>
            <Footer />
          </Panel>
        );
      `);

      expect(code).toContain('Panel');
      expect(code).toContain('Header');
      expect(code).toContain('Body');
      expect(code).toContain('Footer');
      expect(code).not.toContain('get Panel');
      expect(code).not.toContain('get Header');
      expect(code).not.toContain('get Body');
      expect(code).not.toContain('get Footer');
      expect(code).not.toContain('_imports');
    });

    it('handles JSX fragments without breaking', () => {
      const code = transformCode(`
        import React from 'react';
        import { Item } from './components';
        export default () => (
          <>
            <Item />
            <Item />
          </>
        );
      `);

      expect(code).toContain('React');
      expect(code).toContain('Item');
      expect(code).not.toContain('get React');
      expect(code).not.toContain('get Item');
    });

    it('does not transform imports used in JSX member expressions (Context.Provider)', () => {
      const code = transformCode(`
        import React from 'react';
        import { PerformanceContext } from './contexts';
        import { helper } from './utils';
        export default () => (
          <PerformanceContext.Provider value={{}}>
            <div>{helper()}</div>
          </PerformanceContext.Provider>
        );
      `);

      // PerformanceContext used in JSX member expression - not transformed
      expect(code).toContain('PerformanceContext');
      expect(code).not.toContain('get PerformanceContext');

      // helper not used in JSX - transformed
      expect(code).toContain('get helper');
    });

    it('does not transform imports in nested JSX member expressions', () => {
      const code = transformCode(`
        import { Theme } from './theme';
        import { utility } from './utils';
        export default () => (
          <Theme.Dark.Container>
            {utility()}
          </Theme.Dark.Container>
        );
      `);

      // Theme used in nested JSX member expression - not transformed
      expect(code).toContain('Theme');
      expect(code).not.toContain('get Theme');

      // utility not used in JSX - transformed
      expect(code).toContain('get utility');
    });

    it('handles Context.Provider pattern correctly (React context usage)', () => {
      const code = transformCode(`
        import React, { useMemo } from 'react';
        import { MyContext } from './context';
        import { helper } from './utils';

        export function MyProvider({ children }) {
          const value = useMemo(() => helper(), []);
          return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
        }
      `);

      // MyContext used in JSX member expression - NOT transformed
      expect(code).toContain('MyContext');
      expect(code).not.toContain('get MyContext');
      expect(code).toMatch(/import.*MyContext.*from.*\.\/context/);

      // helper not used in JSX - transformed
      expect(code).toContain('get helper');
    });
  });
});
