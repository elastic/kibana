/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readPackageExports, buildExportsReverseMap, resolvePublicSubpath } = require('../scanner');

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
});
