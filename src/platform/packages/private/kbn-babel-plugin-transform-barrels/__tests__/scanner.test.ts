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
});
