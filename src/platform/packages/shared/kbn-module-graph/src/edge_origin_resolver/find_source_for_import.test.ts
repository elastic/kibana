/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { EdgeExtractor } from '../edge_extractor';
import { EdgeExtractorTransformResult } from '../edge_extractor/types';
import { FileParser } from '../file_parser';
import { FileParseTransformResult } from '../file_parser/types';
import { TransformerCacheProvider } from '../transformer_cache_provider';
import { findSourceForImport } from './find_source_for_import';
import { EdgeOriginResolverTransformOptions, EdgeOriginResolverTransformResult } from './types';

describe('findSourceForImport', () => {
  let options: EdgeOriginResolverTransformOptions & {
    getEdgeOriginResolverTransformResult: (
      filePath: string
    ) => EdgeOriginResolverTransformResult | null;
  };

  function resolve(filePath: string, opts: { paths: string[] }) {
    if (Path.isAbsolute(filePath)) {
      return filePath;
    }
    return Path.join(opts.paths[0], filePath);
  }

  function shouldIgnore(filePath: string) {
    return !filePath.startsWith('.') && !Path.isAbsolute(filePath);
  }

  const setupFiles = (files: Record<string, string>) => {
    const cacheProvider = new TransformerCacheProvider();
    const fileParserCache = cacheProvider.create<FileParseTransformResult>();

    const fileParser = new FileParser(fileParserCache);

    function getFileContents(filePath: string) {
      const content = files[filePath];
      if (!content) {
        throw new Error(`File ${filePath} not found`);
      }
      return content;
    }

    const fileParserOptions = {
      babel: {
        transform: {
          plugins: [],
        },
      },
      getFileContents,
      shouldIgnore,
    };

    Object.keys(files).forEach((filePath) => {
      fileParser.process(filePath, fileParserOptions);
    });

    const edgeExtractorCache = cacheProvider.create<EdgeExtractorTransformResult>(fileParserCache);

    const edgeExtractor = new EdgeExtractor(edgeExtractorCache);

    const edgeResolverCache =
      cacheProvider.create<EdgeOriginResolverTransformResult>(edgeExtractorCache);

    options = {
      getEdgeExtractorTransformResult: (filePath) =>
        edgeExtractor.process(filePath, {
          getFileParseResult: (fp) => fileParser.process(fp, fileParserOptions),
          resolve,
          shouldIgnore,
        }),
      getEdgeOriginResolverTransformResult: (filePath) => {
        let result = edgeResolverCache.get(filePath);

        if (!result) {
          result = {
            path: filePath,
            sources: new Map(),
            edgesToProcess: new Set(),
            dependents: new Set(),
          };
          edgeResolverCache.set(filePath, result);
        }

        return result;
      },
      resolve,
      shouldIgnore,
    };
  };

  it('resolves direct export in the same file', () => {
    setupFiles({ '/src/source.js': `export const a = 1;` });

    const src = findSourceForImport('a', '/src/source.js', options);

    expect(src).toEqual({
      filePath: '/src/source.js',
      name: 'a',
      dependencies: ['/src/source.js'],
    });
  });

  it('resolves re-exported binding', () => {
    setupFiles({
      '/src/source.js': `export const a = 1;`,
      '/src/barrel.js': `export { a } from './source.js';`,
    });

    const src = findSourceForImport('a', '/src/barrel.js', options);

    expect(src).toEqual({
      filePath: '/src/source.js',
      name: 'a',
      dependencies: ['/src/barrel.js', '/src/source.js'],
    });
  });

  it('resolves default re-export', () => {
    setupFiles({
      '/src/source.js': `export default 'hello';`,
      '/src/barrel.js': `export { default } from './source.js';`,
    });

    const src = findSourceForImport('default', '/src/barrel.js', options);

    expect(src).toEqual({
      filePath: '/src/source.js',
      name: 'default',
      dependencies: ['/src/barrel.js', '/src/source.js'],
    });
  });

  it('resolves renamed exports across files', () => {
    setupFiles({
      '/src/source.js': `const a = 1; export { a as b };`,
      '/src/barrel.js': `export { b as c } from './source.js';`,
    });

    const src = findSourceForImport('c', '/src/barrel.js', options);

    expect(src).toEqual({
      filePath: '/src/source.js',
      name: 'b',
      dependencies: ['/src/barrel.js', '/src/source.js'],
    });
  });

  it('resolves through export * from', () => {
    setupFiles({
      '/src/a.js': `export const val = 'a';`,
      '/src/b.js': `export * from './a.js';`,
    });

    const src = findSourceForImport('val', '/src/b.js', options);

    expect(src).toEqual({
      filePath: '/src/a.js',
      name: 'val',
      dependencies: ['/src/b.js', '/src/a.js'],
    });
  });

  it('throws when module cannot be found', () => {
    setupFiles({ '/src/consumer.js': `import { a } from './nonexistent.js';` });

    // nonexistent module
    expect(() => findSourceForImport('a', '/src/nonexistent.js', options)).toThrow();
  });

  it('returns the import specifier when module has no matching export', () => {
    setupFiles({
      '/src/empty.js': `console.log("");`,
      '/src/entry.js': `export { a } from './empty.js';`,
    });
    const src2 = findSourceForImport('a', '/src/entry.js', options);
    expect(src2).toEqual({
      filePath: '/src/empty.js',
      name: 'a',
      dependencies: ['/src/entry.js', '/src/empty.js'],
    });
  });

  it('returns null for side-effect imports (null itemName)', () => {
    setupFiles({ '/src/a.js': `export const x = 1;` });
    const src = findSourceForImport(null, '/src/a.js', options);
    expect(src).toBeNull();
  });

  it('resolves export that re-exports a local imported alias', () => {
    setupFiles({
      '/src/a.js': `export const a = 1;`,
      '/src/b.js': `import { a as aa } from './a.js'; export { aa as b };`,
    });

    const src = findSourceForImport('b', '/src/b.js', options);
    expect(src).toEqual({
      filePath: '/src/a.js',
      name: 'a',
      dependencies: ['/src/b.js', '/src/a.js'],
    });
  });

  it('resolves through multi-hop export * chains', () => {
    setupFiles({
      '/src/a.js': `export const v = 1;`,
      '/src/b.js': `export * from './a.js';`,
      '/src/c.js': `export * from './b.js';`,
    });

    const src = findSourceForImport('v', '/src/c.js', options);
    expect(src).toEqual({
      filePath: '/src/a.js',
      name: 'v',
      dependencies: ['/src/c.js', '/src/b.js', '/src/a.js'],
    });
  });

  it('returns the cached object instance on repeated lookups', () => {
    setupFiles({ '/src/a.js': `export const a = 1;` });

    const first = findSourceForImport('a', '/src/a.js', options);
    const second = findSourceForImport('a', '/src/a.js', options);

    expect(first).toBe(second);
  });

  it('honors shouldIgnore and returns null', () => {
    setupFiles({ '/src/a.js': `export const a = 1;` });

    const src = findSourceForImport('a', '/src/a.js', {
      ...options,
      shouldIgnore: (fp: string) => fp === '/src/a.js',
    });

    expect(src).toBeNull();
  });

  it('resolves CommonJS default export (module.exports = x)', () => {
    setupFiles({ '/src/cjs.js': `const x = 42; module.exports = x;` });

    const src = findSourceForImport('default', '/src/cjs.js', options);
    expect(src).toEqual({
      filePath: '/src/cjs.js',
      name: 'default',
      dependencies: ['/src/cjs.js'],
    });
  });

  it('resolves deep re-export chains', () => {
    setupFiles({
      '/src/source.js': `export function deepFunc() {}`,
      '/src/barrel2.js': `export { deepFunc } from './source.js';`,
      '/src/barrel1.js': `export { deepFunc } from './barrel2.js';`,
    });

    const src = findSourceForImport('deepFunc', '/src/barrel1.js', options);
    expect(src).toEqual({
      filePath: '/src/source.js',
      name: 'deepFunc',
      dependencies: ['/src/barrel1.js', '/src/barrel2.js', '/src/source.js'],
    });
  });

  it('resolves wildcards in deep chains', () => {
    setupFiles({
      '/src/utils.js': `export function util1() {}; export function util2() {}`,
      '/src/barrel.js': `export * from './utils.js';`,
    });

    const src1 = findSourceForImport('util1', '/src/barrel.js', options);
    const src2 = findSourceForImport('util2', '/src/barrel.js', options);

    expect(src1).toEqual({
      filePath: '/src/utils.js',
      name: 'util1',
      dependencies: ['/src/barrel.js', '/src/utils.js'],
    });
    expect(src2).toEqual({
      filePath: '/src/utils.js',
      name: 'util2',
      dependencies: ['/src/barrel.js', '/src/utils.js'],
    });
  });

  it('handles circular re-exports gracefully', () => {
    setupFiles({
      '/src/a.js': `export { funcA } from './a.js'; export { funcB } from './b.js';`,
      '/src/b.js': `export { funcB } from './b.js'; export { funcA } from './a.js';`,
    });

    // These should either resolve or return null without infinite loops
    const srcA = findSourceForImport('funcA', '/src/a.js', options);
    const srcB = findSourceForImport('funcB', '/src/b.js', options);

    // Both should be null since they're self-referencing
    expect(srcA).toBeNull();
    expect(srcB).toBeNull();
  });

  it('resolves renamed exports in chains', () => {
    setupFiles({
      '/src/source.js': `export function originalFunc() {}`,
      '/src/barrel.js': `export { originalFunc as renamedFunc } from './source.js';`,
    });

    const src = findSourceForImport('renamedFunc', '/src/barrel.js', options);
    expect(src).toEqual({
      filePath: '/src/source.js',
      name: 'originalFunc',
      dependencies: ['/src/barrel.js', '/src/source.js'],
    });
  });

  it('handles mixed scenarios with local exports, imports, and re-exports', () => {
    setupFiles({
      '/src/source.js': `export function importedFunc() {}; export function reexportedFunc() {}`,
      '/src/mixed.js': `
        function localFunc() {}
        import { importedFunc } from './source.js';
        export { localFunc, importedFunc };
        export { reexportedFunc as renamedFunc } from './source.js';
      `,
    });

    // Local export should resolve to the file itself
    const localSrc = findSourceForImport('localFunc', '/src/mixed.js', options);
    expect(localSrc).toEqual({
      filePath: '/src/mixed.js',
      name: 'localFunc',
      dependencies: ['/src/mixed.js'],
    });

    // Imported then re-exported should resolve to original source
    const importedSrc = findSourceForImport('importedFunc', '/src/mixed.js', options);
    expect(importedSrc).toEqual({
      filePath: '/src/source.js',
      name: 'importedFunc',
      dependencies: ['/src/mixed.js', '/src/source.js'],
    });

    // Direct re-export with rename should resolve to original source
    const reexportedSrc = findSourceForImport('renamedFunc', '/src/mixed.js', options);
    expect(reexportedSrc).toEqual({
      filePath: '/src/source.js',
      name: 'reexportedFunc',
      dependencies: ['/src/mixed.js', '/src/source.js'],
    });
  });

  it('handles wildcard expansion with preserved non-wildcard edges', () => {
    setupFiles({
      '/src/source.js': `export function wildcardFunc() {}`,
      '/src/other.js': `export function specificFunc() {}`,
      '/src/barrel.js': `
        function localFunc() {}
        export { localFunc };
        export * from './source.js';
        export { specificFunc } from './other.js';
      `,
    });

    const localSrc = findSourceForImport('localFunc', '/src/barrel.js', options);
    expect(localSrc).toEqual({
      filePath: '/src/barrel.js',
      name: 'localFunc',
      dependencies: ['/src/barrel.js'],
    });

    const wildcardSrc = findSourceForImport('wildcardFunc', '/src/barrel.js', options);
    expect(wildcardSrc).toEqual({
      filePath: '/src/source.js',
      name: 'wildcardFunc',
      dependencies: ['/src/barrel.js', '/src/source.js'],
    });

    const specificSrc = findSourceForImport('specificFunc', '/src/barrel.js', options);
    expect(specificSrc).toEqual({
      filePath: '/src/other.js',
      name: 'specificFunc',
      dependencies: ['/src/barrel.js', '/src/other.js'],
    });
  });

  it('only processes files that are needed for resolution (lazy processing)', () => {
    const files: Record<string, string> = {
      '/src/target.js': `export const target = 1;`,
      '/src/barrel.js': `export { target } from './target.js';`,
      '/src/unrelated1.js': `export const unrelated1 = 1;`,
      '/src/unrelated2.js': `export const unrelated2 = 2;`,
      '/src/unrelated3.js': `export const unrelated3 = 3;`,
    };

    // Setup files using the existing helper
    setupFiles(files);

    const processedFiles = new Set<string>();

    // Wrap getEdgeExtractorTransformResult to track which files get processed
    const originalGetEdgeExtractorTransformResult = options.getEdgeExtractorTransformResult;
    const mockGetEdgeExtractorTransformResult = jest.fn().mockImplementation((filePath: string) => {
      processedFiles.add(filePath);
      return originalGetEdgeExtractorTransformResult(filePath);
    });

    const testOptions = {
      ...options,
      getEdgeExtractorTransformResult: mockGetEdgeExtractorTransformResult,
    };

    // Resolve target from barrel - should only process barrel.js and target.js
    const src = findSourceForImport('target', '/src/barrel.js', testOptions);

    expect(src).toEqual({
      filePath: '/src/target.js',
      name: 'target',
      dependencies: ['/src/barrel.js', '/src/target.js'],
    });

    // Verify that only the necessary files were processed during resolution
    expect(processedFiles.has('/src/barrel.js')).toBe(true);
    expect(processedFiles.has('/src/target.js')).toBe(true);

    // Verify that unrelated files were NOT processed
    expect(processedFiles.has('/src/unrelated1.js')).toBe(false);
    expect(processedFiles.has('/src/unrelated2.js')).toBe(false);
    expect(processedFiles.has('/src/unrelated3.js')).toBe(false);

    // Should have processed exactly 2 files (barrel and target)
    expect(processedFiles.size).toBe(2);
  });

  describe('resolution chain tracking', () => {
    it('tracks resolution chain for simple re-export', () => {
      setupFiles({
        '/src/source.js': `export const foo = 1;`,
        '/src/barrel.js': `export { foo } from './source.js';`,
      });

      const src = findSourceForImport('foo', '/src/barrel.js', options);

      expect(src).toEqual({
        filePath: '/src/source.js',
        name: 'foo',
        dependencies: ['/src/barrel.js', '/src/source.js'],
      });
    });

    it('tracks resolution chain for multi-hop re-exports', () => {
      setupFiles({
        '/src/source.js': `export const foo = 1;`,
        '/src/barrel2.js': `export { foo } from './source.js';`,
        '/src/barrel1.js': `export { foo } from './barrel2.js';`,
        '/src/consumer.js': `import { foo } from './barrel1.js';`,
      });

      const src = findSourceForImport('foo', '/src/barrel1.js', options);

      expect(src).toEqual({
        filePath: '/src/source.js',
        name: 'foo',
        dependencies: ['/src/barrel1.js', '/src/barrel2.js', '/src/source.js'],
      });
    });

    it('tracks resolution chain for export * from chains', () => {
      setupFiles({
        '/src/a.js': `export const val = 'a';`,
        '/src/b.js': `export * from './a.js';`,
        '/src/c.js': `export * from './b.js';`,
      });

      const src = findSourceForImport('val', '/src/c.js', options);

      expect(src).toEqual({
        filePath: '/src/a.js',
        name: 'val',
        dependencies: ['/src/c.js', '/src/b.js', '/src/a.js'],
      });
    });

    it('tracks resolution chain for mixed import/re-export scenarios', () => {
      setupFiles({
        '/src/original.js': `export const value = 42;`,
        '/src/intermediate.js': `import { value } from './original.js'; export { value as renamed };`,
        '/src/final.js': `export { renamed as finalName } from './intermediate.js';`,
      });

      const src = findSourceForImport('finalName', '/src/final.js', options);

      expect(src).toEqual({
        filePath: '/src/original.js',
        name: 'value',
        dependencies: ['/src/final.js', '/src/intermediate.js', '/src/original.js'],
      });
    });

    it('has empty resolution chain for direct exports', () => {
      setupFiles({
        '/src/direct.js': `export const direct = 1;`,
      });

      const src = findSourceForImport('direct', '/src/direct.js', options);

      expect(src).toEqual({
        filePath: '/src/direct.js',
        name: 'direct',
        dependencies: ['/src/direct.js'],
      });
    });

    it('tracks resolution chain for complex nested barrel exports', () => {
      setupFiles({
        '/src/utils/helper.js': `export const helper = () => 'help';`,
        '/src/utils/index.js': `export { helper } from './helper.js';`,
        '/src/lib/index.js': `export * from '../utils/index.js';`,
        '/src/index.js': `export { helper as mainHelper } from './lib/index.js';`,
      });

      const src = findSourceForImport('mainHelper', '/src/index.js', options);

      expect(src).toEqual({
        filePath: '/src/utils/helper.js',
        name: 'helper',
        dependencies: [
          '/src/index.js',
          '/src/lib/index.js',
          '/src/utils/index.js',
          '/src/utils/helper.js',
        ],
      });
    });
  });

  it("never returns '*' as the resolved item name (namespace import)", () => {
    setupFiles({
      '/src/utils.js': `export const a = 1;`,
      '/src/barrel.js': `export * from './utils.js';`,
    });

    const src = findSourceForImport('*', '/src/barrel.js', options);

    expect(src).not.toBeNull();
    expect(src && src.name).toBeNull();
  });

  it("never returns '*' as the resolved item name (direct export *)", () => {
    setupFiles({
      '/src/utils.js': `export const a = 1;`,
      '/src/barrel.js': `export * from './utils.js';`,
    });

    // Lookup some concrete export via export *
    const srcConcrete = findSourceForImport('a', '/src/barrel.js', options);
    expect(srcConcrete).toEqual({
      filePath: '/src/utils.js',
      name: 'a',
      dependencies: ['/src/barrel.js', '/src/utils.js'],
    });

    // And ensure wildcard lookup doesn't surface '*'
    const srcWildcard = findSourceForImport('*', '/src/utils.js', options);
    expect(srcWildcard).not.toBeNull();
    expect(srcWildcard && srcWildcard.name).toBeNull();
  });
});
