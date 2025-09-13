/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { Node } from '@babel/types';
import { __lazyRequire } from '../helper';
import { requireDeferred } from '../require_deferred';
import { LAZY_REQUIRE_IMMEDIATE } from '../constants';

/** Utility: parse with basic syntax we care about enabled. */
function parseWithCommonJS(code: string) {
  return parse(code, {
    sourceType: 'script', // Changed to script for CJS
    allowAwaitOutsideFunction: true,
    plugins: [
      'jsx',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'dynamicImport',
      'optionalChaining',
      'nullishCoalescingOperator',
      'typescript',
      'decorators-legacy',
    ],
  });
}

/** Utility: ensure a program parses and contains at least one require call when expected. */
function expectParsesAndFindsRequires(ast: Node) {
  let foundRequires = 0;
  traverse(ast, {
    CallExpression(path) {
      if (
        path.node.callee.type === 'Identifier' &&
        path.node.callee.name === 'require' &&
        path.node.arguments.length === 1 &&
        path.node.arguments[0].type === 'StringLiteral'
      ) {
        foundRequires++;
      }
    },
  });
  expect(foundRequires).toBeGreaterThan(0);
}

describe('lazy_require plugin - parser support smoke tests', () => {
  it('parses CommonJS requires and exports', () => {
    const code = `
      const fs = require('fs');
      const { join } = require('path');
      module.exports.foo = 'bar';
      exports.baz = 42;
    `;
    const ast = parseWithCommonJS(code);
    expectParsesAndFindsRequires(ast);
  });

  it('parses requires with interop helpers', () => {
    const code = `
      const _foo = _interopRequireDefault(require('foo'));
      const bar = _interopRequireWildcard(require('bar'));
      console.log(_foo.default, bar.named);
    `;
    const ast = parseWithCommonJS(code);
    expectParsesAndFindsRequires(ast);
  });

  it('parses destructuring requires', () => {
    const code = `
      const { a, b: renamed } = require('lib');
      console.log(a, renamed);
    `;
    const ast = parseWithCommonJS(code);
    expectParsesAndFindsRequires(ast);
  });
});

describe('lazy_require plugin - transform contract', () => {
  afterAll(() => {
    (globalThis as any)[LAZY_REQUIRE_IMMEDIATE] = undefined;
  });

  /** Returns Babel transform result using the node_preset (ESM->CJS + lazyRequire). */
  function transform(input: string, opts: { filename?: string; lazyRequire?: unknown } = {}) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const babel = require('@babel/core');
    return babel.transformSync(input, {
      filename: opts.filename || 'file.js',
      sourceType: 'module', // ESM input
      presets: [
        [
          require.resolve('@kbn/babel-preset/node_preset'),
          {
            '@babel/preset-env': { modules: 'cjs' },
            lazyRequire: opts.lazyRequire || {
              enabled: true,
            },
          },
        ],
      ],
      generatorOpts: { compact: false },
      ast: true,
      code: true,
      babelrc: false,
      configFile: false,
      comments: true,
      retainLines: false,
    }).code;
  }

  // Execute transformed code in a sandbox with mocked require to observe deferral
  function execTransformed(input: string, opts: { filename?: string; lazyRequire?: unknown } = {}) {
    const code = transform(input, opts);
    /**
     * Create a tiny CommonJS sandbox with require tracking.
     */
    const requireCalls: string[] = [];
    const module: { exports: any } = { exports: {} };
    const exports: any = module.exports;

    function makeRequire(map?: Record<string, any>) {
      return function req(id: string): any {
        // Ignore Babel runtime helper modules in the require call log
        if (!/^@babel\/runtime\//.test(id)) {
          requireCalls.push(id);
        }

        if (id === '@kbn/lazy-require') {
          return { __lazyRequire, requireDeferred };
        }

        if (id === '@kbn/lazy-require/src/require_deferred_auto') {
          require('../require_deferred_auto');
        }
        // Provide minimal mocks for Babel helpers used in transformed output
        if (id === '@babel/runtime/helpers/interopRequireDefault') {
          return function _interopRequireDefault(m: any): any {
            return m && m.__esModule ? m.default : m;
          };
        }
        if (map && Object.prototype.hasOwnProperty.call(map, id)) {
          return map[id];
        }
        // Return a dummy module if not mapped to avoid crashes in tests
        return {};
      };
    }

    // eslint-disable-next-line no-new-func
    const fn = new Function('module', 'exports', 'require', code);
    return {
      run(requireMap: Record<string, any> = {}) {
        requireCalls.length = 0; // Reset calls
        fn(module, exports, makeRequire(requireMap));
        return { exports: module.exports as any, requireCalls: requireCalls as string[] };
      },
      code,
    };
  }

  it('transforms simple require to lazy require', () => {
    const input = `import fs from 'fs'; console.log(fs.readFile);`;
    const out = transform(input);
    expect(out).toContain('__lazyRequire(');
    // Accept either direct require('fs') or interop-wrapped require for default imports
    expect(out).toMatch(
      /__lazyRequire\(\s*\(\)\s*=>\s*(?:_interopRequireDefault\(\s*require\(["']fs["']\)\s*\)|require\(["']fs["']\))\s*\)/
    );
    // Access may require .default for default imports
    expect(out).toMatch(/console\.log\([^)]*?\.value(?:\.default)?\.readFile\)/);
  });

  it('transforms destructuring require to lazy require', () => {
    const input = `import { join, resolve as resolvePath } from 'path'; console.log(join, resolvePath);`;
    const out = transform(input);
    expect(out).toContain('__lazyRequire(');
    expect(out).toMatch(/__lazyRequire\(\s*\(\)\s*=>\s*require\(["']path["']\)\s*\)/);
    expect(out).toMatch(/console\.log\([^)]*?\.value\.join,\s*[^)]*?\.value\.resolve\)/);
  });

  it('preserves interop wrapper requires', () => {
    const input = `import foo from 'foo'; console.log(foo);`;
    const out = transform(input);
    expect(out).toContain('__lazyRequire(');
    // ESM default import becomes _interopRequireDefault(require('foo'))
    expect(out).toMatch(
      /__lazyRequire\(\s*\(\)\s*=>\s*_interopRequireDefault\(require\(["']foo["']\)\)\s*\)/
    );
    expect(out).toMatch(/console\.log\([^)]*?\.value(?:\.default)?\)/);
  });

  it('preserves side-effect requires', () => {
    const input = `import 'side-effect-module'; import x from 'normal';`;
    const out = transform(input);
    // Side-effect import becomes bare require()
    expect(out).toMatch(/require\(["']side-effect-module["']\)/);
    // Normal import should be wrapped
    expect(out).toMatch(
      /__lazyRequire\(\s*\(\)\s*=>\s*_interopRequireDefault\(require\(["']normal["']\)\)\s*\)/
    );
  });

  it('skips non-constant bindings', () => {
    const input = `import fs from 'fs'; let mutableFs = fs; mutableFs = null; console.log(mutableFs);`;
    const out = transform(input);
    // Original fs import should be lazified
    expect(out).toMatch(
      /__lazyRequire\(\s*\(\)\s*=>\s*_interopRequireDefault\(require\(["']fs["']\)\)\s*\)/
    );
    // But assignment to mutableFs should work normally
    expect(out).toMatch(/mutableFs\s*=\s*null/);
  });

  it('transforms var declaration when not reassigned', () => {
    const input = `import fs from 'fs'; function use(){ return fs.readFile; }`;
    const out = transform(input);
    expect(out).toContain('__lazyRequire');
    expect(out).toMatch(/var\s+[A-Za-z_$][\w$]*\s*=\s*__lazyRequire\(/);
    expect(out).toMatch(/return\s+[A-Za-z_$][\w$]*\.value(?:\.default)?\.readFile/);
  });

  it('transforms var destructuring when not reassigned', () => {
    const input = `import { join } from 'path'; function use(){ return join('a','b'); }`;
    const out = transform(input);
    expect(out).toContain('__lazyRequire');
    expect(out).toMatch(/var\s+[A-Za-z_$][\w$]*\s*=\s*__lazyRequire\(/);
    // Allow Babel's call extraction form: (0, obj.value.join)(...)
    expect(out).toMatch(/return\s+\(0,\s*[^)]*\.value\.join\)\(/);
  });

  it('skips non-top-level requires', () => {
    const input = `function load() { const fs = require('fs'); return fs; }`;
    const out = transform(input);
    // This remains CJS inside a function, shouldn't be transformed by ESM->CJS
    expect(out).toMatch(/const\s+fs\s*=\s*require\(["']fs["']\)/);
    expect(out).not.toContain('__lazyRequire');
  });

  it('handles require.resolve calls (skipped)', () => {
    const input = `const path = require.resolve('./config'); console.log(path);`;
    const out = transform(input);
    // This is raw CJS and should remain unchanged
    expect(out).toMatch(/const\s+path\s*=\s*require\.resolve\(["']\.\/config["']\)/);
    expect(out).not.toContain('__lazyRequire');
  });

  describe('runtime deferral and memoization', () => {
    it('defers simple require until used', () => {
      const input = `
        import fs from 'fs';
        function use() { return fs.readFile; }
        export const useFs = use;
      `;
      const { run } = execTransformed(input);
      const mod = run({
        fs: { default: { readFile: () => 'ok' } },
      });
      // No require at module init
      expect(mod.requireCalls).toEqual(['@kbn/lazy-require']);
      // First call triggers exactly one require
      expect(mod.exports.useFs()).toBeDefined();
      expect(mod.requireCalls).toEqual(['@kbn/lazy-require', 'fs']);
      // Second call should not require again (memoized)
      expect(mod.exports.useFs()).toBeDefined();
      expect(mod.requireCalls).toEqual(['@kbn/lazy-require', 'fs']);
    });

    it('defers destructured require until used', () => {
      const input = `
        import { join, basename } from 'path';
        function use() { return join('a', basename('b')); }
        export { use };
      `;
      const { run } = execTransformed(input);
      const mod = run({
        path: { join: (a: string, b: string) => a + '/' + b, basename: (p: string) => p },
      });
      expect(mod.requireCalls).toEqual(['@kbn/lazy-require']);
      expect(mod.exports.use()).toBe('a/b');
      expect(mod.requireCalls).toEqual(['@kbn/lazy-require', 'path']);
      expect(mod.exports.use()).toBe('a/b');
      expect(mod.requireCalls).toEqual(['@kbn/lazy-require', 'path']);
    });
  });

  it('handles property access on lazy requires', () => {
    const input = `
      import os from 'os';
      export const getCpus = () => os.cpus();
      export const getPlatform = () => os.platform();
    `;
    const out = transform(input);

    expect(out).toMatch(/\.value(?:\.default)?\.cpus\(\)/);
    expect(out).toMatch(/\.value(?:\.default)?\.platform\(\)/);

    const { run } = execTransformed(input);
    const mod = run({
      os: {
        default: {
          cpus: () => ['cpu1', 'cpu2'],
          platform: () => 'linux',
        },
      },
    });
    expect(mod.requireCalls).toEqual(['@kbn/lazy-require']);
    expect(mod.exports.getCpus()).toEqual(['cpu1', 'cpu2']);
    expect(mod.requireCalls).toEqual(['@kbn/lazy-require', 'os']);
    expect(mod.exports.getPlatform()).toBe('linux');
    expect(mod.requireCalls).toEqual(['@kbn/lazy-require', 'os']); // still just one call due to memoization
  });

  it('handles member expression chaining', () => {
    const input = `
      import foo from 'foo';
      export default () => foo.method().property;
    `;
    const out = transform(input);
    expect(out).toMatch(/\.value(?:\.default)?\.method\(\)\.property/);
  });

  it('handles object shorthand properties from lazy requires', () => {
    const input = `
      import { join, basename } from 'path';
      export { join, basename };
    `;
    const out = transform(input);
    // Babel compiles named exports into defineProperty getters; ensure getters return lazy values
    expect(out).toMatch(
      /Object\.defineProperty\(exports,\s*["']join["'][\s\S]*?get:\s*function\s*\(\)\s*{[\s\S]*?return\s+[A-Za-z_$][\w$]*\.value(?:\.default)?\.join;[\s\S]*?}\s*\)/
    );
    expect(out).toMatch(
      /Object\.defineProperty\(exports,\s*["']basename["'][\s\S]*?get:\s*function\s*\(\)\s*{[\s\S]*?return\s+[A-Za-z_$][\w$]*\.value(?:\.default)?\.basename;[\s\S]*?}\s*\)/
    );
  });

  it('preserves require calls in expressions (inline requires)', () => {
    const input = `console.log(require('./config').value);`;
    const out = transform(input);
    // Raw CJS code should pass through unchanged
    expect(out).toMatch(/require\(["']\.\/config["']\)\.value/);
    expect(out).not.toContain('__lazyRequire');
  });

  it('leaves destructured require calls only', () => {
    const input = `const { config } = require('./config');
    console.log(config.value);`;
    const out = transform(input);

    expect(out).not.toContain('__lazyRequire');
  });

  it('respects specifiers.exclude option', () => {
    const input = `import { join } from 'my_module'; console.log(join('a','b'));`;
    const out = transform(input, { lazyRequire: { specifiers: { exclude: ['my_module'] } } });
    // Should not lazify 'my_module' import
    expect(out).not.toContain('__lazyRequire');
    expect(out).toMatch(/require\(["']my_module["']\)/);
  });

  it('respects keep comment on ESM import (works with ESM→CJS rewrite)', () => {
    const input = `
      // lazy-require keep
      import fs from 'fs';
      export const get = () => fs.readFile;
    `;
    const { run, code } = execTransformed(input);
    const mod = run({ fs: { default: { readFile: () => 'ok' } } });

    // No lazy helper should be injected
    expect(code).not.toContain('__lazyRequire');
    // The import should be eagerly required at module init time
    expect(mod.requireCalls).toEqual(['fs']);
    // Runtime still behaves correctly
    expect(typeof mod.exports.get).toBe('function');
  });

  it('handles variable naming conflicts', () => {
    const input = `
        import dateMath from '@kbn/datemath';
        import { chain } from 'fp-ts/Either';
        import { pipe } from 'fp-ts/pipeable';
        import * as r from 'io-ts'; // r could cause a naming conflict because it's an argument to interopRequireWildcard

        export function isValidDatemath(value) {
          const parsedValue = dateMath.parse(value);
          return !!(parsedValue && parsedValue.isValid());
        }

        export const datemathStringRT = new r.Type(
          'datemath',
          r.string.is,
          (value, context) =>
            pipe(
              r.string.validate(value, context),
              chain((stringValue) =>
                isValidDatemath(stringValue) ? r.success(stringValue) : r.failure(stringValue, context)
              )
            ),
          String
        );
        
      `;
    const { run } = execTransformed(input);

    expect(() => {
      run({
        '@kbn/datemath': require('@kbn/datemath'),
        'fp-ts/Either': require('fp-ts/Either'),
        'fp-ts/pipeable': require('fp-ts/pipeable'),
        'io-ts': require('io-ts'),
      });
    }).not.toThrow();
  });

  describe('requireDeferred() hoisting', () => {
    afterAll(() => {
      (globalThis as any)[LAZY_REQUIRE_IMMEDIATE] = undefined;
    });

    it('replaces import with require_deferred_auto', () => {
      const input = `
        import { requireDeferred } from '@kbn/lazy-require';
        const x = 1;
        requireDeferred();
        const y = 2;
      `;
      const out = transform(input);

      expect(out.indexOf('requireDeferred()')).toBe(-1);
      expect(out).toContain('@kbn/lazy-require/src/require_deferred_auto');
    });

    it('ignores similarly named calls from other modules', () => {
      const input = `
        import { requireDeferred as rd } from '@kbn/not-lazy-require';
        const a = 1;
        rd();
        const b = 2;
      `;
      const out = transform(input);

      expect(out).toContain('requireDeferred)()');
      expect(out).not.toContain('@kbn/lazy-require/src/require_deferred_auto');
    });
  });

  it('requireDeferred() triggers eager requires at runtime', () => {
    const input = `
      import foo from 'foo';
      import { bar } from 'bar';
      import { requireDeferred } from '@kbn/lazy-require';
      
      
      export const getFoo = () => foo;
      export const getBar = () => bar;
      // set eager mode
      requireDeferred();
    `;

    const { run } = execTransformed(input, { filename: 'require_me.js' });
    const mod = run({
      foo: { default: 'F' },
      bar: { bar: 'B' },
    });

    // Calling requireDeferred should cause eager requires of modules.
    // The mock require logs '@kbn/lazy-require' once (helper), then both modules.
    // Some helper requires (e.g. interop) may be present and are ignored by our logger.
    expect(mod.requireCalls).toEqual([
      '@kbn/lazy-require',
      '@kbn/lazy-require/src/require_deferred_auto',
      'foo',
      'bar',
    ]);

    expect(mod.exports.getFoo()).toBe('F');
    expect(mod.exports.getBar()).toBe('B');
    // No additional requires should be logged on access
    expect(mod.requireCalls).toContain('foo');
    expect(mod.requireCalls).toContain('bar');
  });

  it(`correctly handles exports named 'value'`, () => {
    const entryInput = `
    import { value } from './value';

    export const myExport = 'foo';
    export const reexported = value;
    `;

    const valueInput = `
      import * as t from 'io-ts';
    export const value = t.string;`;

    const value = execTransformed(valueInput);

    const valueModule = value.run({
      'io-ts': require('io-ts'),
    });

    const entry = execTransformed(entryInput);

    const entryModule = entry.run({
      './value': valueModule.exports,
      '@kbn/lazy-object': {
        requireDeferred,
        __lazyRequire,
      },
    });

    expect(valueModule.exports.value).not.toBeUndefined();

    expect(valueModule.exports.value.value).toBeUndefined();

    expect(entryModule.exports.myExport).toBe('foo');

    expect(entryModule.exports.reexported).toBe(valueModule.exports.value);
  });

  it('correctly handles wildcard re-exports', () => {
    const entryInput = `
      export * from './other';
    `;

    const otherInput = `
      export const foo = 'foo';
      export const bar = 'bar';
    `;

    const other = execTransformed(otherInput);

    const otherModule = other.run({});

    const entry = execTransformed(entryInput);

    const entryModule = entry.run({
      './other': otherModule.exports,
      '@kbn/lazy-object': {
        __lazyRequire,
      },
    });

    expect(otherModule.exports.foo).not.toBeUndefined();
    expect(otherModule.exports.bar).not.toBeUndefined();

    expect(entryModule.exports.foo).toBe(otherModule.exports.foo);
    expect(entryModule.exports.bar).toBe(otherModule.exports.bar);
  });
});

describe('lazy-require plugin integration tests', () => {
  describe('with transformer_config (Jest integration)', () => {
    function transformWithJestConfig(input: string, opts: { filename?: string } = {}) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const babel = require('@babel/core') as typeof import('@babel/core');
      const src = '@kbn/test/src/jest/transforms/babel/transformer_config';
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const transformerConfig = require(src)({
        lazyRequires: {
          enabled: true,
          debug: {
            include: [],
          },
          files: {
            include: [],
            exclude: [],
          },
          specifiers: {
            exclude: [],
          },
        },
      });

      return babel.transformSync(input, {
        filename: opts.filename || 'file.js',
        sourceType: 'module',
        ...transformerConfig,
        babelrc: false,
        configFile: false,
      })!.code!;
    }

    it('works with Jest transformer config', () => {
      const input = `
        import React from 'react';
        import { myConst, myOtherConst } from '@elastic/eui';

        
        export const TestComponent = () => <div>{myConst}</div>;

        export { myOtherConst };
        
      `;
      const out = transformWithJestConfig(input, { filename: 'my_component.tsx' });

      // Should have lazy requires for imports
      expect(out).toContain('__lazyRequire');
      // Should have CJS exports
      expect(out).toContain('exports.TestComponent');
    });
  });
});
