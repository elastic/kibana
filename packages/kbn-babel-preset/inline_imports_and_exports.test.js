/**
 * These tests define the contract for the Babel plugin `kbn-babel-plugin-inline-imports-and-exports`.
 * They intentionally DO NOT import the plugin yet. We first validate we can parse
 * all required syntax with Babel, and we describe (via skipped tests) the exact
 * transforms the plugin must perform once implemented.
 *
 * Scenarios covered:
 * - ESM imports and exports (default, named, namespace, export all, re-exports)
 * - Existing CJS requires and exports (should be preserved)
 * - TypeScript (types, enums, interfaces), TS namespaces and module augmentation
 * - JSX/TSX
 * - Top-level usage/destructuring/invocation
 * - Proxies, async iterators
 * - Options: ignore import/export specifiers, ignore paths/extensions, enabled flag
 */

const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

/** Utility: parse with all syntax we care about enabled. */
function parseWithTSX(code) {
  return parse(code, {
    sourceType: 'module',
    allowAwaitOutsideFunction: true,
    plugins: [
      // Stage-3/4-ish we commonly use
      'jsx',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'dynamicImport',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'importAssertions',
      'topLevelAwait',
      'optionalChaining',
      'nullishCoalescingOperator',
      // TS
      'typescript',
      'decorators-legacy',
    ],
  });
}

/** Utility: ensure a program parses and contains at least one import/export when expected. */
function expectParsesAndFinds(ast, selectors = { imports: true, exports: true }) {
  const found = { imports: 0, exports: 0 };
  traverse(ast, {
    ImportDeclaration() {
      found.imports++;
    },
    ExportNamedDeclaration() {
      found.exports++;
    },
    ExportDefaultDeclaration() {
      found.exports++;
    },
    ExportAllDeclaration() {
      found.exports++;
    },
  });
  if (selectors.imports) expect(found.imports).toBeGreaterThan(0);
  if (selectors.exports) expect(found.exports).toBeGreaterThan(0);
}

describe('inline_imports_and_exports plugin - parser support smoke tests', () => {
  it('parses TS namespaces and module augmentation with ESM', () => {
    const code = `
			declare module 'foo' {
				export const x: number;
			}

			namespace ACME {
				export interface Widget { id: string }
				export const version = '1.0.0';
			}

			import def, { a as aa, b, type C } from './lib.ts';
			export { aa, b };
			export default def;
			export * from './more';
			export * as NS from './ns';
		`;
    const ast = parseWithTSX(code);
    expectParsesAndFinds(ast);
  });

  it('parses JSX/TSX and top-level await with imports/exports', () => {
    const code = `
			import React, { useMemo } from 'react';
			import type { FC } from 'react';
			export const data = await Promise.resolve(1);
			export const C: FC = () => <div>{useMemo(() => data, [data])}</div>;
			export default C;
		`;
    const ast = parseWithTSX(code);
    expectParsesAndFinds(ast);
  });

  it('parses CJS requires and exports alongside ESM', () => {
    const code = `
			const fs = require('fs');
			const { join } = require('path');
			module.exports.foo = 'bar';
			exports.baz = 42;
			import def from './x';
			export { def };
		`;
    const ast = parseWithTSX(code);
    expectParsesAndFinds(ast);
  });

  it('parses proxies and async iterators', () => {
    const code = `
			import * as mod from './y';
			export async function* g() { yield* [1,2,3]; }
			export const P = new Proxy(mod, { get(t, p){ return t[p]; } });
		`;
    const ast = parseWithTSX(code);
    expectParsesAndFinds(ast);
  });
});

describe('inline_imports_and_exports plugin - transform contract', () => {
  const plugin = require.resolve('./inline_imports_and_exports');

  /** Returns Babel transform result using the yet-to-be-implemented plugin. */
  function transform(input, opts = {}) {
    const babel = require('@babel/core');
    return babel.transformSync(input, {
      filename: opts.filename || 'file.tsx',
      sourceType: 'module',
      plugins: [
        [plugin, { enabled: true, ...(opts.plugin || {}) }],
        [
          require.resolve('@babel/plugin-transform-runtime'),
          {
            version: '^7.12.5',
          },
        ],
        ['@babel/plugin-syntax-jsx'],
      ],
      presets: [
        [
          '@babel/preset-typescript',
          {
            allowNamespaces: true,
            allowDeclareFields: true,
          },
        ],
      ],
      parserOpts: {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'dynamicImport',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'importAssertions',
          'topLevelAwait',
        ],
      },
      generatorOpts: { compact: false },
      ast: true,
      code: true,
      babelrc: false,
      configFile: false,
      comments: false,
      retainLines: false,
    }).code;
  }

  // Execute transformed code in a sandbox with mocked require to observe deferral
  function execTransformed(input, opts = {}) {
    const code = transform(input, opts);
    /**
     * Create a tiny CommonJS sandbox with require tracking.
     */
    const requireCalls = [];
    const module = { exports: {} };
    const exports = module.exports;
    function makeRequire(map) {
      return function req(id) {
        requireCalls.push(id);
        if (map && Object.prototype.hasOwnProperty.call(map, id)) {
          return map[id];
        }
        // Return a dummy module if not mapped to avoid crashes in tests
        return {};
      };
    }
    // Transform TS namespaces to executable JS using TypeScript transpiler
    const ts = require('typescript');
    const jsOut = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2019,
        jsx: ts.JsxEmit.React,
        removeComments: true,
        declaration: false,
        esModuleInterop: false,
        allowJs: true,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
      },
      fileName: opts.filename || 'file.tsx',
      reportDiagnostics: false,
    });
    const jsCode = jsOut.outputText;
    // eslint-disable-next-line no-new-func
    const fn = new Function('module', 'exports', 'require', jsCode);
    return {
      run(requireMap = {}) {
        fn(module, exports, makeRequire(requireMap));
        return { exports: module.exports, requireCalls };
      },
      code,
    };
  }

  it('rewrites default import to lazy require', () => {
    const input = `import def from './lib'; console.log(def());`;
    const out = transform(input);
    expect(out).toContain('function _mod_lib() {');
    expect(out).toContain('require("./lib")');
    expect(out).toContain('_interopDefault(_mod_lib())()');
  });

  it('rewrites named import to lazy require + property access', () => {
    const input = `import { a, b as c } from './lib'; console.log(a, c);`;
    const out = transform(input);
    expect(out).toContain('function _mod_lib() {');
    expect(out).toContain('require("./lib")');
    expect(out).toContain('_mod_lib().a, _mod_lib().b');
  });

  it('rewrites namespace import to lazy require object', () => {
    const input = `import * as ns from './lib'; ns.run();`;
    const out = transform(input);
    expect(out).toContain('function _mod_lib() {');
    expect(out).toContain('require("./lib")');
    expect(out).toContain('_mod_lib_ns().run()');
  });

  it('preserves existing requires/exports', () => {
    const input = `const fs = require('fs'); export const x = 1;`;
    const out = transform(input);
    expect(out).toMatch(/require\('fs'\)/);
  });

  it('handles export named from (re-export)', () => {
    const input = `export { a as b } from './lib';`;
    const out = transform(input);
    expect(out).toContain('function _mod_lib() {');
    expect(out).toContain('require("./lib")');
    expect(out).toContain('Object.defineProperty(exports, "b"');
  });

  it('handles export all from', () => {
    const input = `export * from './lib';`;
    const out = transform(input);
    expect(out).toContain('function _mod_lib() {');
    expect(out).toContain('require("./lib")');
    expect(out).toContain('for (const k in _mod_lib())');
  });

  it('handles export namespace from', () => {
    const input = `export * as NS from './lib';`;
    const out = transform(input);
    expect(out).toContain('function _mod_lib() {');
    expect(out).toContain('require("./lib")');
    expect(out).toContain('exports.NS = _mod_lib_ns();');
  });

  it('handles export default', () => {
    const input = `import x from './x'; export default x;`;
    const out = transform(input);
    expect(out).toContain('export default _interopDefault(_mod_x());');
  });

  it('handles top-level destructuring of imports', () => {
    const input = `import { a, b } from './lib'; const x = a + b;`;
    const out = transform(input);
    expect(out).toContain('_lib().a');
    expect(out).toContain('_lib().b');
  });

  it('handles proxies and async iterators consuming imports', () => {
    const input = `import * as mod from './lib'; const P = new Proxy(mod, { get: (t, p) => t[p] }); export async function* g(){ yield* mod.values; }`;
    const out = transform(input);
    expect(out).toContain('_lib()');
  });

  it('rewrites imports used inside functions', () => {
    const input = `import { a, b as c } from './lib'; function f(){ return a + c; } console.log(f());`;
    const out = transform(input);
    expect(out).toContain('function _mod_lib() {');
    expect(out).toContain('require("./lib")');
    expect(out).toContain('return _mod_lib().a + _mod_lib().b');
    expect(out).toContain('console.log(f())');
  });

  it('rewrites object shorthand properties from imports', () => {
    const input = `import { a, b as c } from './lib'; const o = { a, c }; console.log(o);`;
    const out = transform(input);
    expect(out).toContain('function _mod_lib() {');
    expect(out).toContain('require("./lib")');
    // object shorthand should be expanded to explicit properties that reference the lazy require
    // We allow either `{ a: _mod_lib().a, c: _mod_lib().b }` or generator variants without spaces
    expect(out).toMatch(/\{\s*a:\s*_mod_lib\(\)\.a,\s*c:\s*_mod_lib\(\)\.b\s*\}/);
    expect(out).toContain('console.log(o)');
  });

  describe('runtime deferral and memoization', () => {
    it('defers default import until used', () => {
      const input = `
        import def from './lib';
        export function use() { return def(); }
      `;
      const { run } = execTransformed(input);
      const mod = run({
        './lib': () => 'ok',
      });
      // No require at module init
      expect(mod.requireCalls).toEqual([]);
      // First call triggers exactly one require
      expect(mod.exports.use()).toBe('ok');
      expect(mod.requireCalls).toEqual(['./lib']);
      // Second call should not require again (memoized)
      expect(mod.exports.use()).toBe('ok');
      expect(mod.requireCalls).toEqual(['./lib']);
    });

    it('defers named imports until used', () => {
      const input = `
        import { a, b as c } from './lib';
        export function sum() { return a + c; }
      `;
      const { run } = execTransformed(input);
      const mod = run({
        './lib': { a: 1, b: 2 },
      });
      expect(mod.requireCalls).toEqual([]);
      expect(mod.exports.sum()).toBe(3);
      expect(mod.requireCalls).toEqual(['./lib']);
      expect(mod.exports.sum()).toBe(3);
      expect(mod.requireCalls).toEqual(['./lib']);
    });

    it('defers namespace import until used', () => {
      const input = `
        import * as ns from './lib';
        export function go() { return ns.run(); }
      `;
      const { run } = execTransformed(input);
      const lib = { run: () => 'go' };
      const mod = run({ './lib': lib });
      expect(mod.requireCalls).toEqual([]);
      expect(mod.exports.go()).toBe('go');
      expect(mod.requireCalls).toEqual(['./lib']);
      expect(mod.exports.go()).toBe('go');
      expect(mod.requireCalls).toEqual(['./lib']);
    });
  });

  it('ignores files with namespaces', () => {
    const input = `
      import { IngestStream } from './ingest';
      /* eslint-disable @typescript-eslint/no-namespace */
      export namespace Streams {
        export import ingest = IngestStream;
        export const all = [ingest.all];
      }
      Streams.ingest = IngestStream;
      export const r = Streams.all[0];
    `;

    const out = transform(input);

    expect(out).not.toContain(`_mod_ingest`)

    expect(out).toMatchInlineSnapshot(`
      "import { IngestStream } from './ingest';
      export let Streams;
      (function (_Streams) {
        var ingest = IngestStream;
        const all = _Streams.all = [ingest.all];
      })(Streams || (Streams = {}));
      Streams.ingest = IngestStream;
      export const r = Streams.all[0];"
    `);

  });

  it('removes type-only exports (TS) to avoid runtime refs', () => {
    const input = `
      import type { Lifecycle } from './lib';
      export { Lifecycle };
    `;
    const out = transform(input);
    expect(out).not.toContain('exports.Lifecycle');

    expect(out).toMatchInlineSnapshot(`"export {};"`);
  });

  it('does not rewrite TS type positions (typeof/type references)', () => {
    const input = `import { a } from './lib'; type T = typeof a; interface I { x: a; }`;
    const out = transform(input);
    // With @babel/preset-typescript, pure type constructs and type-only imports are removed.
    // Ensure our plugin did not introduce any runtime rewrites and Babel removed the import.
    expect(out).not.toContain("import { a } from './lib'");
    expect(out).not.toContain('_lib()');
    expect(out.trim() === '' || out.trim() === 'export {};').toBe(true);
  });

  it('regression: does not rewrite inside TS typeof qualified name (BaseStream.Model) and still rewrites runtime usage', () => {
    const input = `
      import { BaseStream } from './base';
      // type-only positions below must not be rewritten
      export type M = typeof BaseStream.Model;
      export interface I { m: BaseStream.Model }
      // runtime usage must be rewritten
      export const f = () => BaseStream.run();
    `;
    const out = transform(input, { filename: 'file.ts' });
    // Should create a lazy require for './base' and rewrite runtime usage
    expect(out).toContain("function _mod_base() {");
    expect(out).toContain("require(\"./base\")");
    expect(out).toContain('_mod_base().BaseStream.run()');

    // Execute to ensure deferral works and no crashes from type-only constructs
    const { run } = execTransformed(input, { filename: 'file.ts' });
    const mod = run({ './base': { BaseStream: { run: () => 'ok' } } });
    // No require at module init since f() not called yet
    expect(mod.requireCalls).toEqual([]);
    expect(mod.exports.f()).toBe('ok');
    expect(mod.requireCalls).toEqual(['./base']);
  });

  it('regression: jest can spy on namespace import properties (configurable)', () => {
    const input = `
      import * as streamDefinition from './stream_from_definition';
      export const getNS = () => streamDefinition;
      export const call = () => streamDefinition.streamFromDefinition('x');
    `;
    const { run } = execTransformed(input, { filename: 'file.ts' });
    const orig = jest.fn(() => 'orig');
    const mod = run({ './stream_from_definition': { streamFromDefinition: orig } });
    const ns = mod.exports.getNS();
    // Should be able to spy on and redefine the method without throwing
    expect(() => jest.spyOn(ns, 'streamFromDefinition')).not.toThrow();
    const spy = jest.spyOn(ns, 'streamFromDefinition').mockImplementation(() => 'spy');
    expect(mod.exports.call()).toBe('spy');
    expect(spy).toHaveBeenCalledWith('x');
  });

  it('regression: jest can spy on re-exported members from export-all', () => {
    const input = `export * from './lib';`;
    const { run } = execTransformed(input, { filename: 'file.ts' });
    const orig = jest.fn(() => 'orig');
    const mod = run({ './lib': { fn: orig } });
    // Should be able to spy on the getter-defined export and replace it
    expect(() => jest.spyOn(mod.exports, 'fn')).not.toThrow();
    const spy = jest.spyOn(mod.exports, 'fn').mockImplementation(() => 'spy');
    expect(mod.exports.fn()).toBe('spy');
    expect(spy).toHaveBeenCalled();
  });

  it('regression: namespace accessor returns real module object (cross-consumer spying)', () => {
    const input = `
      import * as ns from './lib';
      export const getNS = () => ns;
      export const call = () => {
        const lib = require('./lib');
        return lib.fn();
      };
    `;
    const { run } = execTransformed(input, { filename: 'file.ts' });
    const orig = jest.fn(() => 'orig');
    const mod = run({ './lib': { fn: orig } });
    const ns = mod.exports.getNS();
    // Spying on the namespace should affect calls via require('./lib') too
    const spy = jest.spyOn(ns, 'fn').mockImplementation(() => 'spy');
    expect(mod.exports.call()).toBe('spy');
    expect(spy).toHaveBeenCalled();
  });

  it('replaces default imports used in member expressions and optional chaining (os)', () => {
    const input = `
      import Os from 'os';
      export class CIStatsReporter {
        collect(){
          const meta = {
            cpuCount: Os.cpus()?.length,
            cpuModel: Os.cpus()[0]?.model,
            cpuSpeed: Os.cpus()[0]?.speed,
            freeMem: Os.freemem(),
            osArch: Os.arch(),
            osPlatform: Os.platform(),
            osRelease: Os.release(),
            totalMem: Os.totalmem(),
          };
          return meta;
        }
      }
    `;
    const out = transform(input, { filename: 'ci_stats_reporter.ts' });
    // should create a lazy require for 'os' and replace all Os references
    expect(out).toContain('function _mod_os() {');
    expect(out).toContain('require("os")');
    expect(out).not.toContain('import Os from');
    // spot-check a few rewritten expressions
    expect(out).toContain('_interopDefault(_mod_os()).cpus()?.length');
    expect(out).toContain('_interopDefault(_mod_os()).freemem()');
    expect(out).toContain('_interopDefault(_mod_os()).platform()');

    // Execute and verify it calls require only once on use
    const { run } = execTransformed(input, { filename: 'ci_stats_reporter.ts' });
    const osMock = {
      cpus: () => [{ model: 'x', speed: 1 }],
      freemem: () => 123,
      arch: () => 'x64',
      platform: () => 'darwin',
      release: () => '23.0.0',
      totalmem: () => 999,
    };
    const mod = run({ os: osMock });
    const meta = new mod.exports.CIStatsReporter().collect();
    expect(meta.cpuCount).toBe(1);
    expect(mod.requireCalls).toEqual(['os']);
    // second call should not require again
    new mod.exports.CIStatsReporter().collect();
    expect(mod.requireCalls).toEqual(['os']);
  });

  it('does not corrupt helper function with imported variable names (set regression)', () => {
    const input = `
      import { set } from 'safer-lodash-set';
      import def from './lib';
      export function useImports() {
        set({}, 'key', 'value');
        return def();
      }
    `;

    const out = transform(input);
    // Helper should remain intact with correct 'set' variable
    expect(out).not.toContain('if (!_mod_safer_lodash_set().set) {');
    // Should create lazy requires for both imports
    expect(out).toContain('function _mod_safer_lodash_set() {');
    expect(out).toContain('function _mod_lib() {');
    // Should replace the imported references correctly
    expect(out).toContain("_mod_safer_lodash_set().set({}, 'key', 'value')");
    expect(out).toContain('return _interopDefault(_mod_lib())()');
  });
});
