/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * These tests define the contract for the Babel plugin that transforms CommonJS requires to lazy/deferred requires.
 * The plugin takes existing `require()` calls and wraps them in lazy accessors to defer module loading.
 *
 * Scenarios covered:
 * - Simple require declarations: const x = require('mod')
 * - Destructuring requires: const { a, b } = require('mod')
 * - Interop wrapper preservation: _interopRequireDefault(require('mod'))
 * - Side-effect requires (preserved as-is)
 * - Non-constant bindings (skipped)
 * - Runtime deferral and memoization
 * - Integration with node_preset and transformer_config
 */

const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

/** Utility: parse with basic syntax we care about enabled. */
function parseWithCommonJS(code) {
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
function expectParsesAndFindsRequires(ast) {
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

describe('defer_requires plugin - parser support smoke tests', () => {
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

describe('defer_requires plugin - transform contract', () => {
  /** Returns Babel transform result using the node_preset (ESM->CJS + defer_requires). */
  function transform(input, opts = {}) {
    const babel = require('@babel/core');
    return babel.transformSync(input, {
      filename: opts.filename || 'file.js',
      sourceType: 'module', // ESM input
      presets: [
        [
          require.resolve('./node_preset'),
          { '@babel/preset-env': { modules: 'cjs' }, defer_requires: opts.defer_requires || {} },
        ],
      ],
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

    // Mock __lazyRequire helper
    function __lazyRequire(factory) {
      let cached = null;
      let called = false;
      return {
        get value() {
          if (!called) {
            cached = factory();
            called = true;
          }
          return cached;
        },
      };
    }

    function makeRequire(map) {
      return function req(id) {
        // Ignore Babel runtime helper modules in the require call log
        if (!/^@babel\/runtime\//.test(id)) {
          requireCalls.push(id);
        }
        // Provide minimal mocks for Babel helpers used in transformed output
        if (id === '@babel/runtime/helpers/interopRequireDefault') {
          return function _interopRequireDefault(m) {
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
    const fn = new Function('module', 'exports', 'require', '__lazyRequire', code);
    return {
      run(requireMap = {}) {
        requireCalls.length = 0; // Reset calls
        fn(module, exports, makeRequire(requireMap), __lazyRequire);
        return { exports: module.exports, requireCalls };
      },
      code,
    };
  }

  it('transforms simple require to lazy require', () => {
    const input = `import fs from 'fs'; console.log(fs.readFile);`;
    const out = transform(input);
    expect(out).toContain('function __lazyRequire(');
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
    expect(out).toContain('function __lazyRequire(');
    expect(out).toMatch(/__lazyRequire\(\s*\(\)\s*=>\s*require\(["']path["']\)\s*\)/);
    expect(out).toMatch(/console\.log\([^)]*?\.value\.join,\s*[^)]*?\.value\.resolve\)/);
  });

  it('preserves interop wrapper requires', () => {
    const input = `import foo from 'foo'; console.log(foo);`;
    const out = transform(input);
    expect(out).toContain('function __lazyRequire(');
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
      expect(mod.requireCalls).toEqual([]);
      // First call triggers exactly one require
      expect(mod.exports.useFs()).toBeDefined();
      expect(mod.requireCalls).toEqual(['fs']);
      // Second call should not require again (memoized)
      expect(mod.exports.useFs()).toBeDefined();
      expect(mod.requireCalls).toEqual(['fs']);
    });

    it('defers destructured require until used', () => {
      const input = `
        import { join, basename } from 'path';
        function use() { return join('a', basename('b')); }
        export { use };
      `;
      const { run } = execTransformed(input);
      const mod = run({
        path: { join: (a, b) => a + '/' + b, basename: (p) => p },
      });
      expect(mod.requireCalls).toEqual([]);
      expect(mod.exports.use()).toBe('a/b');
      expect(mod.requireCalls).toEqual(['path']);
      expect(mod.exports.use()).toBe('a/b');
      expect(mod.requireCalls).toEqual(['path']);
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
    expect(mod.requireCalls).toEqual([]);
    expect(mod.exports.getCpus()).toEqual(['cpu1', 'cpu2']);
    expect(mod.requireCalls).toEqual(['os']);
    expect(mod.exports.getPlatform()).toBe('linux');
    expect(mod.requireCalls).toEqual(['os']); // still just one call due to memoization
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

  it('respects ignoreSpecifiers option', () => {
    const input = `import { join } from 'path'; console.log(join('a','b'));`;
    const out = transform(input, { defer_requires: { ignoreSpecifiers: ['path'] } });
    // Should not lazify 'path' import
    expect(out).not.toContain('__lazyRequire');
    expect(out).toMatch(/require\(["']path["']\)/);
  });
});

describe('defer_requires plugin integration tests', () => {
  describe('with transformer_config (Jest integration)', () => {
    function transformWithJestConfig(input, opts = {}) {
      const babel = require('@babel/core');
      const src = '@kbn/test/src/jest/transforms/babel/transformer_config';
      // eslint-disable-next-line import/no-dynamic-require
      const transformerConfig = require(src);
      return babel.transformSync(input, {
        filename: opts.filename || 'file.js',
        sourceType: 'module',
        ...transformerConfig,
        babelrc: false,
        configFile: false,
      }).code;
    }

    it('works with Jest transformer config', () => {
      const input = `
        import React from 'react';
        import { render } from '@testing-library/react';
        
        export const TestComponent = () => <div>Hello</div>;
        
        export const runTest = () => {
          const result = render(<TestComponent />);
          return result.container.textContent;
        };
      `;
      const out = transformWithJestConfig(input, { filename: 'test.tsx' });

      // Should work with JSX (compiled to jsx runtime calls or createElement)
      expect(/React\.createElement|\.value\.jsx/.test(out)).toBe(true);
      // Should have lazy requires for imports
      expect(out).toContain('__lazyRequire');
      // Should have CJS exports
      expect(out).toContain('exports.TestComponent');
      expect(out).toContain('exports.runTest');
    });

    it('handles emotion styled components exclusion', () => {
      const input = `
        import styled from '@emotion/styled';
        const Button = styled.button\`
          background: blue;
        \`;
        export default Button;
      `;
      const out = transformWithJestConfig(input, { filename: 'styled.tsx' });

      // Should handle styled components
      expect(out).toContain('__lazyRequire');
      expect(out).toContain('exports.default');
    });

    it('wraps styled-components tagged template with NODE_ENV production by default', () => {
      const input = `
        import styled from 'styled-components';
        const Section = styled.div\`border: 1px solid red;\`;
        export default Section;
      `;
      const out = transformWithJestConfig(input, { filename: 'sc.tsx' });
      // Ensure lazy helper exists and styled usage remains
      expect(out).toContain('__lazyRequire');
      // Expect an IIFE that saves/restores process.env.NODE_ENV and returns the tagged template expr
      expect(out).toMatch(`process.env.NODE_ENV = \"production\"`);

      expect(out).toMatchInlineSnapshot(`
        "\\"use strict\\";

        var _interopRequireDefault = require(\\"@babel/runtime/helpers/interopRequireDefault\\");
        Object.defineProperty(exports, \\"__esModule\\", {
          value: true
        });
        exports.default = void 0;
        var _styledComponents = __lazyRequire(() => _interopRequireDefault(require(\\"styled-components\\")));
        function __lazyRequire(factory) {
          let loaded = false;
          let cache;
          const box = {};
          Object.defineProperty(box, \\"value\\", {
            configurable: true,
            enumerable: true,
            get: function () {
              if (!loaded) {
                cache = factory();
                loaded = true;
              }
              Object.defineProperty(box, \\"value\\", {
                configurable: true,
                enumerable: true,
                writable: true,
                value: cache
              });
              return cache;
            },
            set: function (next) {
              cache = next;
              loaded = true;
              Object.defineProperty(box, \\"value\\", {
                configurable: true,
                enumerable: true,
                writable: true,
                value: next
              });
            }
          });
          return box;
        }
        const Section = (() => {
          const _prevNodeEnv = process.env.NODE_ENV;
          try {
            process.env.NODE_ENV = \\"production\\";
            return _styledComponents.value.default.div\`border: 1px solid red;\`;
          } finally {
            process.env.NODE_ENV = _prevNodeEnv;
          }
        })();
        var _default = exports.default = Section;
        module.exports = exports.default;"
      `);
    });

    it('does not wrap styled-components when option is disabled', () => {
      const babel = require('@babel/core');
      const input = `
        import styled from 'styled-components';
        const Section = styled.div\`color: red;\`;
        export default Section;
      `;
      const code = babel.transformSync(input, {
        filename: 'sc2.tsx',
        sourceType: 'module',
        presets: [
          [
            require.resolve('./node_preset'),
            {
              '@babel/preset-env': { modules: 'cjs' },
              defer_requires: { disableStyledComponentsDynamicCreationWarning: false },
            },
          ],
        ],
        babelrc: false,
        configFile: false,
      }).code;

      // Should still lazy-require styled-components
      expect(code).toContain('__lazyRequire');
      // But must not contain our save/restore NODE_ENV pattern
      expect(/process\.env\.NODE_ENV\s*=\s*['"]production['"]/g.test(code)).toBe(false);
    });
  });
});
