/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';
import Os from 'os';

/* eslint-disable @typescript-eslint/no-var-requires */
const {
  readPackageExports,
  buildExportsReverseMap,
  resolvePublicSubpath,
  buildBarrelIndex,
} = require('../scanner');
/* eslint-enable @typescript-eslint/no-var-requires */

describe('scanner exports reverse mapping', () => {
  describe('buildExportsReverseMap', () => {
    it('builds reverse map for wildcard exports', () => {
      const exportsField = {
        './internal/*': {
          node: './dist/cjs/internal/*.js',
          require: './dist/cjs/internal/*.js',
        },
      };

      const reverseMap = buildExportsReverseMap(exportsField);

      expect(reverseMap).toHaveLength(1);
      expect(reverseMap[0].subpathPattern).toBe('./internal/*');
      expect(reverseMap[0].hasWildcard).toBe(true);
    });

    it('builds reverse map for exact match exports', () => {
      const exportsField = {
        './operators': {
          node: './dist/cjs/operators/index.js',
        },
      };

      const reverseMap = buildExportsReverseMap(exportsField);

      expect(reverseMap).toHaveLength(1);
      expect(reverseMap[0].subpathPattern).toBe('./operators');
      expect(reverseMap[0].hasWildcard).toBe(false);
    });

    it('handles string export values', () => {
      const exportsField = {
        './simple': './dist/simple.js',
      };

      const reverseMap = buildExportsReverseMap(exportsField);

      expect(reverseMap).toHaveLength(1);
      expect(reverseMap[0].subpathPattern).toBe('./simple');
    });

    it('skips package.json export', () => {
      const exportsField = {
        './package.json': './package.json',
        './internal/*': './dist/internal/*.js',
      };

      const reverseMap = buildExportsReverseMap(exportsField);

      expect(reverseMap).toHaveLength(1);
      expect(reverseMap[0].subpathPattern).toBe('./internal/*');
    });

    it('handles nested conditional exports', () => {
      const exportsField = {
        '.': {
          node: {
            require: './dist/cjs/index.js',
          },
        },
      };

      const reverseMap = buildExportsReverseMap(exportsField);

      expect(reverseMap).toHaveLength(1);
    });
  });

  describe('resolvePublicSubpath', () => {
    it('resolves wildcard pattern to public subpath', () => {
      const reverseMap = buildExportsReverseMap({
        './internal/*': {
          node: './dist/cjs/internal/*.js',
        },
      });

      const subpath = resolvePublicSubpath('dist/cjs/internal/Observable.js', reverseMap);

      expect(subpath).toBe('internal/Observable');
    });

    it('resolves nested wildcard paths', () => {
      const reverseMap = buildExportsReverseMap({
        './internal/*': {
          node: './dist/cjs/internal/*.js',
        },
      });

      const subpath = resolvePublicSubpath('dist/cjs/internal/observable/from.js', reverseMap);

      expect(subpath).toBe('internal/observable/from');
    });

    it('resolves exact match export', () => {
      const reverseMap = buildExportsReverseMap({
        './operators': {
          node: './dist/cjs/operators/index.js',
        },
      });

      const subpath = resolvePublicSubpath('dist/cjs/operators/index.js', reverseMap);

      expect(subpath).toBe('operators');
    });

    it('returns null for unmatched paths', () => {
      const reverseMap = buildExportsReverseMap({
        './internal/*': {
          node: './dist/cjs/internal/*.js',
        },
      });

      const subpath = resolvePublicSubpath('dist/esm/other/file.js', reverseMap);

      expect(subpath).toBeNull();
    });

    it('handles paths with leading ./', () => {
      const reverseMap = buildExportsReverseMap({
        './internal/*': {
          node: './dist/cjs/internal/*.js',
        },
      });

      const subpath = resolvePublicSubpath('./dist/cjs/internal/Observable.js', reverseMap);

      expect(subpath).toBe('internal/Observable');
    });
  });

  describe('readPackageExports', () => {
    it('returns null for non-existent package', () => {
      const result = readPackageExports('/non/existent/path');

      expect(result).toBeNull();
    });

    it('reads rxjs exports field', () => {
      // require.resolve('rxjs') returns the main entry file, not package root
      // We need to find the package root that contains package.json

      const rxjsPath = require.resolve('rxjs/package.json');
      const rxjsRoot = Path.dirname(rxjsPath);
      const result = readPackageExports(rxjsRoot);

      expect(result).not.toBeNull();
      // Use bracket notation because './internal/*' contains special characters
      expect(result?.['./internal/*']).toBeDefined();
    });
  });

  describe('export * chain resolution', () => {
    let tempDir: string;

    beforeAll(async () => {
      // Create a temporary directory with test barrel files
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-test-'));

      // Create a multi-level barrel structure:
      // index.ts -> subbarrel/index.ts (export *) -> source.ts
      await Fsp.mkdir(Path.join(tempDir, 'subbarrel'), { recursive: true });

      // source.ts - the actual source file with exports
      await Fsp.writeFile(
        Path.join(tempDir, 'subbarrel', 'source.ts'),
        `export const MyComponent = () => {};
export const MyHelper = 'helper';
export default function defaultFn() {}`
      );

      // subbarrel/index.ts - uses export * from './source'
      await Fsp.writeFile(Path.join(tempDir, 'subbarrel', 'index.ts'), `export * from './source';`);

      // index.ts - main barrel that re-exports from subbarrel
      await Fsp.writeFile(
        Path.join(tempDir, 'index.ts'),
        `export { MyComponent, MyHelper } from './subbarrel';`
      );
    });

    afterAll(async () => {
      // Clean up temp directory
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('follows export * chains to find the actual source file', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);

      // The main barrel should be in the index
      const mainBarrelPath = Path.join(tempDir, 'index.ts');
      expect(barrelIndex[mainBarrelPath]).toBeDefined();

      const exports = barrelIndex[mainBarrelPath].exports;

      // MyComponent should resolve to source.ts, not subbarrel/index.ts
      expect(exports.MyComponent).toBeDefined();
      expect(exports.MyComponent.path).toBe(Path.join(tempDir, 'subbarrel', 'source.ts'));
      expect(exports.MyComponent.localName).toBe('MyComponent');

      // MyHelper should also resolve to source.ts
      expect(exports.MyHelper).toBeDefined();
      expect(exports.MyHelper.path).toBe(Path.join(tempDir, 'subbarrel', 'source.ts'));
      expect(exports.MyHelper.localName).toBe('MyHelper');
    });
  });

  describe('export default handling', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-default-test-'));

      // Create source file with default export
      await Fsp.writeFile(
        Path.join(tempDir, 'source.ts'),
        `export const namedExport = 'named';
export default class MyClass {}`
      );

      // Create barrel that directly exports a default (locally defined)
      await Fsp.writeFile(
        Path.join(tempDir, 'index.ts'),
        `export { namedExport } from './source';
export default function barrelDefault() { return 'default'; }`
      );
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('does NOT capture locally-defined default exports', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);

      const mainBarrelPath = Path.join(tempDir, 'index.ts');
      expect(barrelIndex[mainBarrelPath]).toBeDefined();

      const exports = barrelIndex[mainBarrelPath].exports;

      // Locally-defined default should NOT be in exports (can't transform)
      expect(exports.default).toBeUndefined();

      // Named re-export should still work
      expect(exports.namedExport).toBeDefined();
    });
  });

  describe('re-exported default handling', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-reexport-default-test-'));

      // Create source file with default export
      await Fsp.writeFile(
        Path.join(tempDir, 'Observable.ts'),
        `export default class Observable {}`
      );

      // Create barrel that re-exports default as named
      await Fsp.writeFile(
        Path.join(tempDir, 'index.ts'),
        `export { default as Observable } from './Observable';`
      );
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('marks re-exported defaults with type default', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);

      const mainBarrelPath = Path.join(tempDir, 'index.ts');
      expect(barrelIndex[mainBarrelPath]).toBeDefined();

      const exports = barrelIndex[mainBarrelPath].exports;

      // Observable should be marked as type 'default' since it re-exports a default
      expect(exports.Observable).toBeDefined();
      expect(exports.Observable.type).toBe('default');
      expect(exports.Observable.path).toBe(Path.join(tempDir, 'Observable.ts'));
    });
  });

  describe('CommonJS __exportStar pattern handling', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-exportstar-test-'));

      // Create source file with exports
      await Fsp.writeFile(
        Path.join(tempDir, 'operators.ts'),
        `export const map = () => {};
export const filter = () => {};
export const reduce = () => {};`
      );

      // Create CommonJS barrel using __exportStar pattern (TypeScript compiled output)
      await Fsp.writeFile(
        Path.join(tempDir, 'index.js'),
        `"use strict";
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) exports[p] = m[p];
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./operators"), exports);`
      );
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('handles __exportStar pattern for CommonJS barrels', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);

      const mainBarrelPath = Path.join(tempDir, 'index.js');
      expect(barrelIndex[mainBarrelPath]).toBeDefined();

      const exports = barrelIndex[mainBarrelPath].exports;

      // Should capture all exports from the __exportStar call
      expect(exports.map).toBeDefined();
      expect(exports.map.path).toBe(Path.join(tempDir, 'operators.ts'));
      expect(exports.map.localName).toBe('map');

      expect(exports.filter).toBeDefined();
      expect(exports.filter.path).toBe(Path.join(tempDir, 'operators.ts'));

      expect(exports.reduce).toBeDefined();
      expect(exports.reduce.path).toBe(Path.join(tempDir, 'operators.ts'));
    });
  });

  describe('import then export default handling', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-import-default-test-'));

      // Source file with named export
      await Fsp.writeFile(Path.join(tempDir, 'editor.ts'), `export const ESQLEditor = () => {};`);

      // Barrel that imports then exports as default
      await Fsp.writeFile(
        Path.join(tempDir, 'index.ts'),
        `import { ESQLEditor } from './editor';
export default ESQLEditor;`
      );
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('traces import-then-export-default to source file', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);
      const mainBarrelPath = Path.join(tempDir, 'index.ts');

      expect(barrelIndex[mainBarrelPath]).toBeDefined();
      const exports = barrelIndex[mainBarrelPath].exports;

      // Default should trace to editor.ts, not the barrel
      // Type should be 'named' because editor.ts has a named export, not default
      expect(exports.default).toBeDefined();
      expect(exports.default.path).toBe(Path.join(tempDir, 'editor.ts'));
      expect(exports.default.type).toBe('named');
      expect(exports.default.localName).toBe('ESQLEditor');
    });
  });

  describe('import then export named handling', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-import-export-named-test-'));

      // Source file with multiple exports
      await Fsp.writeFile(
        Path.join(tempDir, 'provider.ts'),
        `export const I18nProvider = () => {};
export const useI18n = () => {};`
      );

      // Barrel that imports then re-exports (no inline from)
      await Fsp.writeFile(
        Path.join(tempDir, 'index.ts'),
        `import { I18nProvider, useI18n } from './provider';
export { I18nProvider, useI18n };`
      );
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('traces import-then-export to source file', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);
      const mainBarrelPath = Path.join(tempDir, 'index.ts');

      expect(barrelIndex[mainBarrelPath]).toBeDefined();
      const exports = barrelIndex[mainBarrelPath].exports;

      // I18nProvider should trace to provider.ts, not the barrel
      expect(exports.I18nProvider).toBeDefined();
      expect(exports.I18nProvider.path).toBe(Path.join(tempDir, 'provider.ts'));
      expect(exports.I18nProvider.localName).toBe('I18nProvider');

      // useI18n should also trace to provider.ts
      expect(exports.useI18n).toBeDefined();
      expect(exports.useI18n.path).toBe(Path.join(tempDir, 'provider.ts'));
      expect(exports.useI18n.localName).toBe('useI18n');
    });
  });

  describe('mixed resolvable and external exports', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-mixed-exports-test-'));

      // Source file with local exports
      await Fsp.writeFile(
        Path.join(tempDir, 'local.ts'),
        `export const LocalComponent = () => {};`
      );

      // Barrel that:
      // 1. Imports from local file AND external package (simulated by non-resolvable path)
      // 2. Re-exports both
      await Fsp.writeFile(
        Path.join(tempDir, 'index.ts'),
        `import { LocalComponent } from './local';
import { ExternalThing } from 'non-existent-external-package';
export { LocalComponent, ExternalThing };`
      );
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('captures resolvable exports and skips external ones', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);
      const mainBarrelPath = Path.join(tempDir, 'index.ts');

      expect(barrelIndex[mainBarrelPath]).toBeDefined();
      const exports = barrelIndex[mainBarrelPath].exports;

      // LocalComponent should be captured and traced to local.ts
      expect(exports.LocalComponent).toBeDefined();
      expect(exports.LocalComponent.path).toBe(Path.join(tempDir, 'local.ts'));
      expect(exports.LocalComponent.localName).toBe('LocalComponent');

      // ExternalThing should NOT be in the exports (external package, not resolvable)
      // This is intentional - the transformer will leave these imports unchanged
      expect(exports.ExternalThing).toBeUndefined();
    });
  });

  describe('import with rename then export handling', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-rename-export-test-'));

      // Source file
      await Fsp.writeFile(Path.join(tempDir, 'source.ts'), `export const OriginalName = 'value';`);

      // Barrel that imports with rename and re-exports
      await Fsp.writeFile(
        Path.join(tempDir, 'index.ts'),
        `import { OriginalName as RenamedLocally } from './source';
export { RenamedLocally as PublicName };`
      );
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('handles import rename followed by export rename', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);
      const mainBarrelPath = Path.join(tempDir, 'index.ts');

      expect(barrelIndex[mainBarrelPath]).toBeDefined();
      const exports = barrelIndex[mainBarrelPath].exports;

      // PublicName should trace to source.ts with the original local name
      expect(exports.PublicName).toBeDefined();
      expect(exports.PublicName.path).toBe(Path.join(tempDir, 'source.ts'));
      expect(exports.PublicName.localName).toBe('OriginalName');
    });
  });

  describe('nested export * chain handling', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-nested-exportall-test-'));

      // Create 3-level deep structure:
      // index.ts -> export * from './middle'
      // middle.ts -> export * from './deep'
      // deep.ts -> export const DeepExport = ...

      await Fsp.writeFile(
        Path.join(tempDir, 'deep.ts'),
        `export const DeepExport = 'deep';
export const AnotherDeep = 'another';`
      );

      await Fsp.writeFile(
        Path.join(tempDir, 'middle.ts'),
        `export * from './deep';
export const MiddleExport = 'middle';`
      );

      await Fsp.writeFile(Path.join(tempDir, 'index.ts'), `export * from './middle';`);
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('follows nested export * chains to find the actual source files', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);
      const mainBarrelPath = Path.join(tempDir, 'index.ts');

      expect(barrelIndex[mainBarrelPath]).toBeDefined();
      const exports = barrelIndex[mainBarrelPath].exports;

      // DeepExport should resolve to deep.ts (2 levels deep)
      expect(exports.DeepExport).toBeDefined();
      expect(exports.DeepExport.path).toBe(Path.join(tempDir, 'deep.ts'));
      expect(exports.DeepExport.localName).toBe('DeepExport');

      // AnotherDeep should also resolve to deep.ts
      expect(exports.AnotherDeep).toBeDefined();
      expect(exports.AnotherDeep.path).toBe(Path.join(tempDir, 'deep.ts'));
      expect(exports.AnotherDeep.localName).toBe('AnotherDeep');

      // MiddleExport should resolve to middle.ts
      expect(exports.MiddleExport).toBeDefined();
      expect(exports.MiddleExport.path).toBe(Path.join(tempDir, 'middle.ts'));
      expect(exports.MiddleExport.localName).toBe('MiddleExport');
    });
  });

  describe('local exports in barrel files', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-local-exports-test-'));

      // Source file
      await Fsp.writeFile(Path.join(tempDir, 'source.ts'), `export const SourceExport = 'source';`);

      // Barrel with both local exports and re-exports
      await Fsp.writeFile(
        Path.join(tempDir, 'index.ts'),
        `export const LocalConst = 'local';
export function LocalFunction() { return 'func'; }
export class LocalClass {}
export { SourceExport } from './source';`
      );
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('filters out local exports to prevent infinite recursion', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);
      const mainBarrelPath = Path.join(tempDir, 'index.ts');

      expect(barrelIndex[mainBarrelPath]).toBeDefined();
      const exports = barrelIndex[mainBarrelPath].exports;

      // Local exports should NOT be in the index because transforming them
      // would produce the same import path, causing infinite recursion
      expect(exports.LocalConst).toBeUndefined();
      expect(exports.LocalFunction).toBeUndefined();
      expect(exports.LocalClass).toBeUndefined();

      // Re-exported SourceExport should still be in the index
      expect(exports.SourceExport).toBeDefined();
      expect(exports.SourceExport.path).toBe(Path.join(tempDir, 'source.ts'));
      expect(exports.SourceExport.localName).toBe('SourceExport');
    });
  });

  describe('barrel with only local exports is excluded from index', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-only-local-test-'));

      // Barrel with ONLY local exports (no re-exports from other files)
      await Fsp.writeFile(
        Path.join(tempDir, 'index.ts'),
        `export const LocalOnly = 'local';
export function LocalFunc() { return 'func'; }`
      );
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('does not include barrel in index when all exports are local', async () => {
      // When a barrel only has local exports, transforming any import from it
      // would produce the same import path, causing infinite recursion.
      // Such barrels should not be in the index at all.
      const barrelIndex = await buildBarrelIndex(tempDir);
      const mainBarrelPath = Path.join(tempDir, 'index.ts');

      // Barrel should NOT be in the index since it has no transformable exports
      expect(barrelIndex[mainBarrelPath]).toBeUndefined();
    });
  });

  describe('mixed export * and local exports', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'barrel-mixed-exportall-test-'));

      // Source file
      await Fsp.writeFile(
        Path.join(tempDir, 'source.ts'),
        `export const SourceA = 'a';
export const SourceB = 'b';`
      );

      // Barrel with export *, local exports, and named re-exports
      await Fsp.writeFile(
        Path.join(tempDir, 'index.ts'),
        `export * from './source';
export const LocalExport = 'local';`
      );
    });

    afterAll(async () => {
      await Fsp.rm(tempDir, { recursive: true, force: true });
    });

    it('captures export * contents but filters out local exports', async () => {
      const barrelIndex = await buildBarrelIndex(tempDir);
      const mainBarrelPath = Path.join(tempDir, 'index.ts');

      expect(barrelIndex[mainBarrelPath]).toBeDefined();
      const exports = barrelIndex[mainBarrelPath].exports;

      // SourceA and SourceB from export * should trace to source.ts
      expect(exports.SourceA).toBeDefined();
      expect(exports.SourceA.path).toBe(Path.join(tempDir, 'source.ts'));

      expect(exports.SourceB).toBeDefined();
      expect(exports.SourceB.path).toBe(Path.join(tempDir, 'source.ts'));

      // LocalExport should NOT be in the index (would cause infinite recursion)
      expect(exports.LocalExport).toBeUndefined();
    });
  });
});
