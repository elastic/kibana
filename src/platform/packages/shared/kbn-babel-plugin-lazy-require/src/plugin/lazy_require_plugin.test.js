/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { transform } = require('@babel/core');
const { runInNewContext } = require('vm');
const lazyRequirePlugin = require('./lazy_require_plugin');

describe('@kbn/babel-plugin-lazy-require', () => {
  /**
   * @typedef {Object} TestContext
   * @property {{exports: any}} module
   * @property {any} exports
   * @property {(id: string) => any} require
   * @property {Array<{path: string, timestamp: number}>} __requireLog
   * @property {typeof console} console
   */

  /**
   * @param {Record<string, any>} modules
   * @returns {TestContext}
   */
  function createTestContext(modules = {}) {
    /** @type {TestContext} */
    const ctx = {
      module: { exports: {} },
      exports: {},
      __requireLog: [],
      console,
      require: (id) => {
        ctx.__requireLog.push({ path: id, timestamp: Date.now() });
        if (modules[id]) {
          return typeof modules[id] === 'function' ? modules[id]() : modules[id];
        }
        throw new Error(`Module not found: ${id}`);
      },
    };
    return ctx;
  }

  function transformCode(code) {
    const result = transform(code, {
      plugins: [lazyRequirePlugin],
      filename: 'test.js',
    });
    // Empty input returns null
    if (!result) {
      return '';
    }
    return result.code || '';
  }

  function runTransformedCode(code, ctx) {
    const transformed = transformCode(code);
    runInNewContext(transformed, ctx);
  }

  describe('basic lazy loading', () => {
    it('defers require() until first property access', () => {
      const code = `
        const foo = require('./foo');
        module.exports = () => foo;
      `;

      const ctx = createTestContext({ './foo': { value: 42 } });
      runTransformedCode(code, ctx);

      // Module should NOT be loaded yet
      expect(ctx.__requireLog).toHaveLength(0);

      // Access the module
      const getFoo = ctx.module.exports;
      const result = getFoo();

      // NOW it should be loaded
      expect(ctx.__requireLog).toHaveLength(1);
      expect(ctx.__requireLog[0].path).toBe('./foo');
      expect(result.value).toBe(42);
    });

    it('caches module after first access', () => {
      const code = `
        const foo = require('./foo');
        module.exports = () => foo;
      `;

      const ctx = createTestContext({ './foo': { value: 42 } });
      runTransformedCode(code, ctx);

      const getFoo = ctx.module.exports;

      // Access multiple times
      getFoo();
      getFoo();
      getFoo();

      // Should only load once
      expect(ctx.__requireLog).toHaveLength(1);
    });

    it('never loads modules that are never accessed', () => {
      const code = `
        const foo = require('./foo');
        const bar = require('./bar');
        module.exports = () => bar;
      `;

      const ctx = createTestContext({
        './foo': { value: 'foo' },
        './bar': { value: 'bar' },
      });
      runTransformedCode(code, ctx);

      const getBar = ctx.module.exports;
      getBar();

      // Only './bar' should be loaded, not './foo'
      expect(ctx.__requireLog).toHaveLength(1);
      expect(ctx.__requireLog[0].path).toBe('./bar');
    });

    it('loads multiple modules independently', () => {
      const code = `
        const foo = require('./foo');
        const bar = require('./bar');
        module.exports = { getFoo: () => foo, getBar: () => bar };
      `;

      const ctx = createTestContext({
        './foo': { name: 'foo' },
        './bar': { name: 'bar' },
      });
      runTransformedCode(code, ctx);

      const exports = ctx.module.exports;

      expect(ctx.__requireLog).toHaveLength(0);

      // Load foo
      const foo = exports.getFoo();
      expect(foo.name).toBe('foo');
      expect(ctx.__requireLog).toHaveLength(1);

      // Load bar
      const bar = exports.getBar();
      expect(bar.name).toBe('bar');
      expect(ctx.__requireLog).toHaveLength(2);

      // Access foo again - should not reload
      exports.getFoo();
      expect(ctx.__requireLog).toHaveLength(2);
    });
  });

  describe('destructuring', () => {
    it('transforms destructured requires', () => {
      const code = `
        const { foo, bar } = require('./utils');
        module.exports = { getFoo: () => foo, getBar: () => bar };
      `;

      const ctx = createTestContext({
        './utils': { foo: 'FOO', bar: 'BAR' },
      });
      runTransformedCode(code, ctx);

      const exports = ctx.module.exports;

      expect(ctx.__requireLog).toHaveLength(0);

      expect(exports.getFoo()).toBe('FOO');
      expect(ctx.__requireLog).toHaveLength(1);

      expect(exports.getBar()).toBe('BAR');
      // Critical: should still be 1 - module not loaded twice!
      expect(ctx.__requireLog).toHaveLength(1);
      expect(ctx.__requireLog[0].path).toBe('./utils');
    });

    it('handles renamed destructured properties', () => {
      const code = `
        const { foo: renamedFoo, bar: renamedBar } = require('./utils');
        module.exports = () => ({ a: renamedFoo, b: renamedBar });
      `;

      const ctx = createTestContext({
        './utils': { foo: 'FOO_VALUE', bar: 'BAR_VALUE' },
      });
      runTransformedCode(code, ctx);

      const result = ctx.module.exports();

      expect(result.a).toBe('FOO_VALUE');
      expect(result.b).toBe('BAR_VALUE');
      expect(ctx.__requireLog).toHaveLength(1);
    });

    it('handles mixed full and destructured imports from same module', () => {
      const code = `
        const utils = require('./utils');
        const { helper } = require('./utils');
        module.exports = { getUtils: () => utils, getHelper: () => helper };
      `;

      const ctx = createTestContext({
        './utils': { helper: 'HELPER', other: 'OTHER' },
      });
      runTransformedCode(code, ctx);

      const exports = ctx.module.exports;

      // Access helper first
      expect(exports.getHelper()).toBe('HELPER');
      expect(ctx.__requireLog).toHaveLength(1);

      // Access full utils - should use cached module
      const utils = exports.getUtils();
      expect(utils.helper).toBe('HELPER');
      expect(utils.other).toBe('OTHER');
      expect(ctx.__requireLog).toHaveLength(1); // Still only 1 load
    });
  });

  describe('const vs let/var', () => {
    it('creates only getter for const declarations', () => {
      const code = `
        const foo = require('./foo');
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain('get foo()');
      expect(transformed).not.toContain('set foo(');
    });

    it('creates getter and setter for let declarations', () => {
      const code = `
        let foo = require('./foo');
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain('get foo()');
      expect(transformed).toContain('set foo(');
    });

    it('creates getter and setter for var declarations', () => {
      const code = `
        var foo = require('./foo');
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain('get foo()');
      expect(transformed).toContain('set foo(');
    });

    it('allows reassignment of let variables', () => {
      const code = `
        let foo = require('./foo');
        module.exports = () => {
          const original = foo;
          foo = { replaced: true };
          return { original, current: foo };
        };
      `;

      const ctx = createTestContext({ './foo': { original: true } });
      runTransformedCode(code, ctx);

      const result = ctx.module.exports();
      expect(result.original).toEqual({ original: true });
      expect(result.current).toEqual({ replaced: true });
    });

    it('setter loads module for side effects before replacing', () => {
      let sideEffectRan = false;

      const code = `
        let foo = require('./foo');
        foo = { replaced: true };
        module.exports = foo;
      `;

      const ctx = createTestContext({
        './foo': () => {
          sideEffectRan = true;
          return { original: true };
        },
      });
      runTransformedCode(code, ctx);

      // Module should have been loaded (for side effects)
      expect(sideEffectRan).toBe(true);
      expect(ctx.__requireLog).toHaveLength(1);

      // But the value should be replaced
      expect(ctx.module.exports).toEqual({ replaced: true });
    });
  });

  describe('what NOT to transform', () => {
    it('does not transform dynamic requires', () => {
      const code = `
        const modulePath = './foo';
        const dynamic = require(modulePath);
        module.exports = dynamic;
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain('require(modulePath)');
      expect(transformed).not.toContain('_imports');
    });

    it('does not transform requires with non-string arguments', () => {
      const code = `
        const computed = require(getPath());
        module.exports = computed;
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain('require(getPath())');
      expect(transformed).not.toContain('_imports');
    });

    it('does not transform side-effect requires', () => {
      const code = `
        require('./side-effect');
        const foo = require('./foo');
        module.exports = foo;
      `;

      const transformed = transformCode(code);
      // Side effect require stays as-is
      expect(transformed).toContain("require('./side-effect')");
      // But foo is transformed
      expect(transformed).toContain('_imports');
    });

    it('does not transform requires inside functions', () => {
      const code = `
        function loadModule() {
          const foo = require('./foo');
          return foo;
        }
        module.exports = loadModule;
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain("require('./foo')");
      expect(transformed).not.toContain('_imports');
    });

    it('does not transform requires inside blocks', () => {
      const code = `
        if (condition) {
          const foo = require('./foo');
          use(foo);
        }
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain("require('./foo')");
      expect(transformed).not.toContain('_imports');
    });

    it('does not transform complex destructuring patterns', () => {
      const code = `
        const { foo: { nested } } = require('./module');
        module.exports = nested;
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain("require('./module')");
      expect(transformed).not.toContain('_imports');
    });

    it('does not transform array destructuring', () => {
      const code = `
        const [first, second] = require('./array-module');
        module.exports = { first, second };
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain("require('./array-module')");
      expect(transformed).not.toContain('_imports');
    });

    it('does not transform rest patterns in destructuring', () => {
      const code = `
        const { foo, ...rest } = require('./module');
        module.exports = { foo, rest };
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain("require('./module')");
      expect(transformed).not.toContain('_imports');
    });

    it('does not transform computed property destructuring', () => {
      const code = `
        const key = 'foo';
        const { [key]: value } = require('./module');
        module.exports = value;
      `;

      const transformed = transformCode(code);
      expect(transformed).toContain("require('./module')");
      expect(transformed).not.toContain('_imports');
    });
  });

  describe('scope handling', () => {
    it('handles variable shadowing correctly', () => {
      const code = `
        const foo = require('./foo');
        function test() {
          const foo = 'shadowed';
          return foo;
        }
        module.exports = { outer: () => foo, inner: test };
      `;

      const ctx = createTestContext({ './foo': { value: 'outer' } });
      runTransformedCode(code, ctx);

      const exports = ctx.module.exports;

      // Inner function should return shadowed value
      expect(exports.inner()).toBe('shadowed');

      // Outer should return module
      expect(exports.outer().value).toBe('outer');
    });

    it('does not transform identifiers in object property shorthand that shadow imports', () => {
      const code = `
        const foo = require('./foo');
        function test(foo) {
          return { foo }; // This 'foo' is the parameter, not the import
        }
        module.exports = test;
      `;

      const ctx = createTestContext({ './foo': { value: 'module' } });
      runTransformedCode(code, ctx);

      const test = ctx.module.exports;
      const result = test('parameter');

      expect(result.foo).toBe('parameter');
      // Module should never be loaded since the import was never used
      expect(ctx.__requireLog).toHaveLength(0);
    });

    it('correctly identifies usage in nested scopes', () => {
      const code = `
        const foo = require('./foo');
        module.exports = () => {
          return () => {
            return () => {
              return foo.value;
            };
          };
        };
      `;

      const ctx = createTestContext({ './foo': { value: 'nested' } });
      runTransformedCode(code, ctx);

      const result = ctx.module.exports()()();
      expect(result).toBe('nested');
      expect(ctx.__requireLog).toHaveLength(1);
    });
  });

  describe('property access patterns', () => {
    it('works with member expressions', () => {
      const code = `
        const foo = require('./foo');
        module.exports = foo.bar.baz;
      `;

      const ctx = createTestContext({
        './foo': { bar: { baz: 'deep' } },
      });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports).toBe('deep');
      expect(ctx.__requireLog).toHaveLength(1);
    });

    it('works with computed member expressions', () => {
      const code = `
        const foo = require('./foo');
        const key = 'dynamic';
        module.exports = foo[key];
      `;

      const ctx = createTestContext({
        './foo': { dynamic: 'value' },
      });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports).toBe('value');
      expect(ctx.__requireLog).toHaveLength(1);
    });

    it('works with function calls', () => {
      const code = `
        const utils = require('./utils');
        module.exports = utils.helper('arg1', 'arg2');
      `;

      const ctx = createTestContext({
        './utils': {
          helper: (...args) => args.join('-'),
        },
      });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports).toBe('arg1-arg2');
      expect(ctx.__requireLog).toHaveLength(1);
    });

    it('works with method chaining', () => {
      const code = `
        const builder = require('./builder');
        module.exports = builder.start().add(1).add(2).build();
      `;

      const ctx = createTestContext({
        './builder': {
          start: () => ({
            value: 0,
            add(n) {
              this.value += n;
              return this;
            },
            build() {
              return this.value;
            },
          }),
        },
      });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports).toBe(3);
      expect(ctx.__requireLog).toHaveLength(1);
    });

    it('works when passed as function argument', () => {
      const code = `
        const foo = require('./foo');
        function process(obj) {
          return obj.value * 2;
        }
        module.exports = process(foo);
      `;

      const ctx = createTestContext({ './foo': { value: 21 } });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports).toBe(42);
      expect(ctx.__requireLog).toHaveLength(1);
    });

    it('works in template literals', () => {
      const code = `
        const config = require('./config');
        module.exports = \`Value is: \${config.value}\`;
      `;

      const ctx = createTestContext({ './config': { value: 42 } });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports).toBe('Value is: 42');
      expect(ctx.__requireLog).toHaveLength(1);
    });

    it('works with spread operator', () => {
      const code = `
        const defaults = require('./defaults');
        module.exports = { custom: true, ...defaults };
      `;

      const ctx = createTestContext({
        './defaults': { a: 1, b: 2 },
      });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports).toEqual({ custom: true, a: 1, b: 2 });
      expect(ctx.__requireLog).toHaveLength(1);
    });
  });

  describe('module path types', () => {
    it('works with relative paths', () => {
      const code = `
        const local = require('./local');
        module.exports = local;
      `;

      const ctx = createTestContext({ './local': { type: 'relative' } });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports.type).toBe('relative');
    });

    it('works with parent relative paths', () => {
      const code = `
        const parent = require('../parent');
        module.exports = parent;
      `;

      const ctx = createTestContext({ '../parent': { type: 'parent' } });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports.type).toBe('parent');
    });

    it('works with node_modules packages', () => {
      const code = `
        const lodash = require('lodash');
        module.exports = lodash;
      `;

      const ctx = createTestContext({ lodash: { name: 'lodash' } });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports.name).toBe('lodash');
    });

    it('works with scoped packages', () => {
      const code = `
        const pkg = require('@kbn/utils');
        module.exports = pkg;
      `;

      const ctx = createTestContext({ '@kbn/utils': { scoped: true } });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports.scoped).toBe(true);
    });

    it('works with deep package paths', () => {
      const code = `
        const deep = require('package/dist/submodule');
        module.exports = deep;
      `;

      const ctx = createTestContext({
        'package/dist/submodule': { deep: true },
      });
      runTransformedCode(code, ctx);

      expect(ctx.module.exports.deep).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty files', () => {
      const code = '';
      const transformed = transformCode(code);
      expect(transformed).toBe('');
    });

    it('handles files with no requires', () => {
      const code = `
        const x = 1 + 2;
        module.exports = x;
      `;

      const transformed = transformCode(code);
      expect(transformed).not.toContain('_imports');
    });

    it('handles multiple requires in one statement', () => {
      const code = `
        const foo = require('./foo'), bar = require('./bar');
        module.exports = { getFoo: () => foo, getBar: () => bar };
      `;

      const ctx = createTestContext({
        './foo': { name: 'foo' },
        './bar': { name: 'bar' },
      });
      runTransformedCode(code, ctx);

      const exports = ctx.module.exports;
      expect(exports.getFoo().name).toBe('foo');
      expect(exports.getBar().name).toBe('bar');
      expect(ctx.__requireLog).toHaveLength(2);
    });

    it('handles requires mixed with other declarations', () => {
      const code = `
        const foo = require('./foo'), regular = 'not-a-require';
        module.exports = { foo: () => foo, regular };
      `;

      const ctx = createTestContext({ './foo': { value: 'from-require' } });
      runTransformedCode(code, ctx);

      const exports = ctx.module.exports;
      expect(exports.regular).toBe('not-a-require');
      expect(exports.foo().value).toBe('from-require');
    });

    it('preserves require call order independence', () => {
      const code = `
        const b = require('./b');
        const a = require('./a');
        module.exports = { getA: () => a, getB: () => b };
      `;

      const loadOrder = [];
      const ctx = createTestContext({
        './a': () => {
          loadOrder.push('a');
          return { name: 'a' };
        },
        './b': () => {
          loadOrder.push('b');
          return { name: 'b' };
        },
      });
      runTransformedCode(code, ctx);

      // Should not load anything yet
      expect(loadOrder).toEqual([]);

      // Access in different order than declaration
      ctx.module.exports.getA();
      expect(loadOrder).toEqual(['a']);

      ctx.module.exports.getB();
      expect(loadOrder).toEqual(['a', 'b']);
    });

    it('handles circular property access correctly', () => {
      const code = `
        const mod = require('./mod');
        module.exports = () => {
          mod.self = mod; // Circular reference
          return mod.self === mod;
        };
      `;

      const ctx = createTestContext({
        './mod': { value: 42 },
      });
      runTransformedCode(code, ctx);

      const result = ctx.module.exports();
      expect(result).toBe(true);
    });
  });

  describe('generated code structure', () => {
    it('generates unique identifiers for module caches', () => {
      const code = `
        const foo = require('./foo');
        const bar = require('./bar');
      `;

      const transformed = transformCode(code);

      // Should have two module cache variables
      expect(transformed.match(/const _module\d* = \{/g)).toHaveLength(2);
    });

    it('generates unique identifier for imports object', () => {
      const code = `
        const foo = require('./foo');
      `;

      const transformed = transformCode(code);

      // Should have imports object
      expect(transformed).toMatch(/const _imports\d* = \{/);
    });

    it('places all generated code at the top of the file', () => {
      const code = `
        console.log('first statement');
        const foo = require('./foo');
        console.log('last statement');
      `;

      const transformed = transformCode(code);

      // Module cache should come before console.log
      const cacheIndex = transformed.indexOf('_module');
      const firstConsoleIndex = transformed.indexOf("console.log('first statement')");
      expect(cacheIndex).toBeLessThan(firstConsoleIndex);
    });
  });
});
