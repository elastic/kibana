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

describe('lazyRequirePlugin', () => {
  function transformCode(code: string) {
    const result = transform(code, {
      plugins: [lazyRequirePlugin],
      filename: 'test.js',
    });
    return result?.code || '';
  }

  interface Context {
    module: { exports: any };
    exports: any;
    require: (id: string) => any;
    __requireCount: number;
    globalThis: Context;
  }

  function createContext(modules: Record<string, any> = {}): Context {
    const ctx = {
      module: { exports: {} },
      exports: {},
      __requireCount: 0,
      require: (id: string) => {
        ctx.__requireCount++;
        if (modules[id]) {
          return modules[id];
        }
        throw new Error(`Module not found: ${id}`);
      },
      get globalThis(): Context {
        return ctx;
      },
    };
    return ctx;
  }

  describe('lazy loading behavior', () => {
    it('defers require() until first access', () => {
      const code = transformCode(`
        const foo = require('foo');
        function getFoo() { return foo; }
        module.exports = getFoo;
      `);

      const ctx = createContext({ foo: { bar: 'baz' } });
      runInNewContext(code, ctx);

      // Module should not be required yet
      expect(ctx.__requireCount).toBe(0);

      // First access should trigger require
      const getFoo = ctx.module.exports;
      const result = getFoo();
      expect(result.bar).toBe('baz');
      expect(ctx.__requireCount).toBe(1);

      // Second access should use cached value
      const result2 = getFoo();
      expect(result2.bar).toBe('baz');
      expect(ctx.__requireCount).toBe(1);
    });

    it('handles multiple requires independently', () => {
      const code = transformCode(`
        const foo = require('foo');
        const bar = require('bar');
        module.exports = { getFoo: () => foo, getBar: () => bar };
      `);

      const ctx = createContext({
        foo: { value: 'foo-value' },
        bar: { value: 'bar-value' },
      });
      runInNewContext(code, ctx);

      const result = ctx.module.exports;
      expect(ctx.__requireCount).toBe(0);

      // Access foo
      expect(result.getFoo().value).toBe('foo-value');
      expect(ctx.__requireCount).toBe(1);

      // Access bar
      expect(result.getBar().value).toBe('bar-value');
      expect(ctx.__requireCount).toBe(2);

      // Access foo again - should be cached
      expect(result.getFoo().value).toBe('foo-value');
      expect(ctx.__requireCount).toBe(2);
    });

    it('works with relative paths', () => {
      const code = transformCode(`
        const local = require('./local');
        function getLocal() { return local; }
        module.exports = getLocal;
      `);

      const ctx = createContext({ './local': { data: 'local-data' } });
      runInNewContext(code, ctx);

      expect(ctx.__requireCount).toBe(0);
      const getLocal = ctx.module.exports;
      expect(getLocal().data).toBe('local-data');
      expect(ctx.__requireCount).toBe(1);
    });

    it('works with scoped packages', () => {
      const code = transformCode(`
        const pkg = require('@scope/package');
        function getPkg() { return pkg; }
        module.exports = getPkg;
      `);

      const ctx = createContext({ '@scope/package': { version: '1.0.0' } });
      runInNewContext(code, ctx);

      expect(ctx.__requireCount).toBe(0);
      const getPkg = ctx.module.exports;
      expect(getPkg().version).toBe('1.0.0');
      expect(ctx.__requireCount).toBe(1);
    });
  });

  describe('const vs let/var declarations', () => {
    it('transforms const declarations', () => {
      const code = transformCode(`
        const foo = require('foo');
        module.exports = foo;
      `);

      expect(code).toContain('get foo()');
      expect(code).not.toContain('set foo(');
    });

    it('transforms let declarations with setter', () => {
      const code = transformCode(`
        let foo = require('foo');
        module.exports = () => foo;
      `);

      expect(code).toContain('get foo()');
      expect(code).toContain('set foo(');
    });

    it('transforms var declarations with setter', () => {
      const code = transformCode(`
        var foo = require('foo');
        module.exports = () => foo;
      `);

      expect(code).toContain('get foo()');
      expect(code).toContain('set foo(');
    });
  });

  describe('edge cases', () => {
    it('does not transform require() with non-string arguments', () => {
      const code = transformCode(`
        const dynamic = require(someVariable);
        module.exports = dynamic;
      `);

      expect(code).toContain('require(someVariable)');
      expect(code).not.toContain('_imports');
    });

    it('does not transform require() without assignment', () => {
      const code = transformCode(`
        require('side-effect');
        module.exports = true;
      `);

      expect(code).toContain("require('side-effect')");
      expect(code).not.toContain('_imports');
    });

    it('does not transform nested requires inside functions', () => {
      const code = transformCode(`
        function load() {
          const foo = require('foo');
          return foo;
        }
        module.exports = load;
      `);

      expect(code).toContain("require('foo')");
      expect(code).not.toContain('_imports');
    });

    it('does not transform destructured requires', () => {
      const code = transformCode(`
        const { foo } = require('bar');
        module.exports = foo;
      `);

      expect(code).toContain("require('bar')");
      expect(code).not.toContain('_imports');
    });

    it('handles files with no requires', () => {
      const code = transformCode(`
        const x = 1 + 2;
        module.exports = x;
      `);

      expect(code).not.toContain('_imports');
      expect(code).toContain('const x = 1 + 2');
    });
  });

  describe('transformation structure', () => {
    it('creates storage variables for each module', () => {
      const code = transformCode(`
        const foo = require('foo');
        const bar = require('bar');
      `);

      expect(code).toContain('const _foo');
      expect(code).toContain('initialized: false');
      expect(code).toContain('const _bar');
    });

    it('creates _imports object with getters', () => {
      const code = transformCode(`
        const foo = require('foo');
      `);

      expect(code).toContain('_imports');
      expect(code).toContain('get foo()');
    });

    it('replaces all usages with _imports access', () => {
      const code = transformCode(`
        const foo = require('foo');
        const result = foo.bar();
        foo.baz();
      `);

      expect(code).toContain('_imports.foo.bar()');
      expect(code).toContain('_imports.foo.baz()');
    });
  });

  describe('environment variable control', () => {
    it('disables transformation when KIBANA_DISABLE_LAZY_REQUIRE=1', () => {
      const originalEnv = process.env.KIBANA_DISABLE_LAZY_REQUIRE;
      process.env.KIBANA_DISABLE_LAZY_REQUIRE = '1';

      try {
        // Need to reload the plugin module to pick up env var
        jest.resetModules();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const lazyRequirePluginDisabled = require('./lazy_require_plugin');

        const result = transform(
          `
        const foo = require('foo');
        module.exports = foo;
      `,
          {
            plugins: [lazyRequirePluginDisabled],
            filename: 'test.js',
          }
        );
        const code = result?.code || '';

        expect(code).toContain("const foo = require('foo')");
        expect(code).not.toContain('_imports');
      } finally {
        // Restore env and module cache
        if (originalEnv === undefined) {
          delete process.env.KIBANA_DISABLE_LAZY_REQUIRE;
        } else {
          process.env.KIBANA_DISABLE_LAZY_REQUIRE = originalEnv;
        }
        jest.resetModules();
      }
    });

    it('enables transformation when KIBANA_DISABLE_LAZY_REQUIRE is not set', () => {
      const code = transformCode(`
        const foo = require('foo');
        module.exports = foo;
      `);

      expect(code).toContain('_imports');
      expect(code).toContain('get foo()');
    });
  });
});
