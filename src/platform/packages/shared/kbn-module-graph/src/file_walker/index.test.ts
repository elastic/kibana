/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { format, formatAst } from '../common/test_helpers';
import { FileWalker } from '.';
import { FileWalkerTransformOptions } from './types';

describe('FileWalker', () => {
  let fileWalker: FileWalker;
  const fileCache = new Map<string, string>();

  const getFileContents = (absoluteFilePath: string) => {
    const content = fileCache.get(absoluteFilePath);
    if (!content) {
      throw new Error(`Could not read file ${absoluteFilePath}`);
    }
    return content;
  };

  // Mock file resolver
  const resolve = (filePath: string, options: { paths: string[] }) => {
    if (Path.isAbsolute(filePath)) {
      return filePath;
    }
    for (const path of options.paths) {
      const absolutePath = Path.join(path, filePath);
      if (fileCache.has(absolutePath)) {
        return absolutePath;
      }
    }
    throw new Error(`Cannot resolve path ${filePath} from one of ${options.paths.join(', ')}`);
  };

  const defaultTransformOptions: FileWalkerTransformOptions = {
    babel: { transform: {} },
    getFileContents: (absoluteFilePath) => {
      const content = fileCache.get(absoluteFilePath);
      if (!content) {
        throw new Error(`Could not read file ${absoluteFilePath}`);
      }
      return content;
    },
    resolve,
    cacheDirectory: '/foo',
  };

  const setupFiles = (files: Record<string, string>) => {
    fileCache.clear();
    Object.entries(files).forEach(([filePath, content]) => {
      fileCache.set(filePath, content);
    });
  };

  beforeEach(() => {
    fileWalker = new FileWalker({ getFileContents });
  });

  describe('process()', () => {
    it('should process simple file without rewrites', () => {
      setupFiles({
        '/src/utils.js': `export const helper = () => 'original'; export default 'utils';`,
      });

      const { rewrite } = fileWalker.process('/src/utils.js', defaultTransformOptions)!;

      expect(rewrite).toBeDefined();
      expect(rewrite?.path).toBe('/src/utils.js');
      expect(rewrite?.rewrites).toEqual([]);

      const outputCode = formatAst(rewrite!.output);
      expect(outputCode).toBe(`export const helper = () => 'original';
export default 'utils';`);
    });

    it('should rewrite imports from barrel files to original sources', () => {
      setupFiles({
        '/src/utils.js': `export const helper = () => 'original';`,
        '/src/barrel.js': `export { helper } from './utils.js';`,
        '/src/consumer.js': `import { helper } from './barrel.js'; export const result = helper();`,
      });

      const result = fileWalker.process('/src/consumer.js', defaultTransformOptions)!;

      expect(result.rewrite).toBeDefined();
      expect(result.rewrite?.path).toBe('/src/consumer.js');
      expect(result.rewrite?.rewrites).toEqual([
        {
          filePath: '/src/consumer.js',
          original: {
            filePath: '/src/barrel.js',
            itemName: 'helper',
          },
          target: {
            filePath: '/src/utils.js',
            itemName: 'helper',
          },
        },
      ]);

      const outputCode = formatAst(result.rewrite!.output);
      expect(outputCode).toBe(
        format(
          `import { helper } from "./utils.js";
          export const result = helper();`
        )
      );
    });

    it('should rewrite default imports through barrel files', () => {
      setupFiles({
        '/src/utils.js': `export default 'utils';`,
        '/src/barrel.js': `export { default } from './utils.js';`,
        '/src/default_consumer.js': `import utils from './barrel.js'; export { utils };`,
      });

      const { rewrite } = fileWalker.process('/src/default_consumer.js', defaultTransformOptions)!;

      expect(rewrite).toBeDefined();
      expect(rewrite?.rewrites).toEqual([
        {
          filePath: '/src/default_consumer.js',
          original: {
            filePath: '/src/barrel.js',
            itemName: 'default',
          },
          target: {
            filePath: '/src/utils.js',
            itemName: 'default',
          },
        },
      ]);

      const outputCode = formatAst(rewrite!.output);
      expect(outputCode).toBe(`import utils from "./utils.js";
export { utils };`);
    });

    it('should handle multiple imports with mixed rewrite scenarios', () => {
      setupFiles({
        '/src/utils.js': `export const helper = () => 'original';`,
        '/src/barrel.js': `export { helper } from "./utils.js";`,
        '/src/multi_consumer.js': `import { helper } from "./barrel.js";
        import * as barrel from "./barrel.js";
        export { helper, barrel };`,
      });

      const result = fileWalker.process('/src/multi_consumer.js', defaultTransformOptions)!;

      expect(result.rewrite).toBeDefined();
      expect(result.rewrite?.rewrites.length).toBeGreaterThan(0);

      const outputCode = formatAst(result.rewrite!.output);
      // Should rewrite the helper import but keep namespace import as-is
      expect(outputCode).toEqual(
        format(`
        import { helper } from "./utils.js";
        import * as barrel from "./barrel.js";
        export { helper, barrel };
      `)
      );
    });

    it.failing('should rewrite CommonJS require calls through barrel files', () => {
      setupFiles({
        '/src/cjs_source.js': `exports.foo = 'cjs_value';`,
        '/src/cjs_barrel.js': `const { foo } = require("./cjs_source.js"); module.exports = { foo };`,
        '/src/cjs_consumer.js': `const { foo } = require("./cjs_barrel.js"); module.exports = { result: foo };`,
      });

      const result = fileWalker.process('/src/cjs_consumer.js', defaultTransformOptions)!;

      expect(result).toBeDefined();
      expect(result.rewrite?.rewrites).toEqual([
        {
          filePath: '/src/cjs_consumer.js',
          original: {
            filePath: '/src/cjs_barrel.js',
            itemName: 'foo',
          },
          target: {
            filePath: '/src/cjs_source.js',
            itemName: 'foo',
          },
        },
      ]);

      const outputCode = formatAst(result.rewrite!.output);
      expect(outputCode).toBe(
        format(`
          const { foo } = require("./cjs_source.js");
          module.exports = {
            result: foo
          };
        `)
      );
    });

    it('should rewrite wildcard imports to specific named imports', () => {
      setupFiles({
        '/src/wildcard_source.js': `export const alpha = 1; export const beta = 2;`,
        '/src/wildcard_barrel.js': `export * from "./wildcard_source.js";`,
        '/src/wildcard_consumer.js': `import { alpha, beta } from "./wildcard_barrel.js"; export { alpha, beta };`,
      });

      const result = fileWalker.process('/src/wildcard_consumer.js', defaultTransformOptions)!;

      const outputCode = formatAst(result.rewrite!.output);
      expect(outputCode).toBe(
        format(
          `import { alpha } from "./wildcard_source.js";
          import { beta } from "./wildcard_source.js";

          export { alpha, beta };`
        )
      );

      expect(result).toBeDefined();
      expect(result.rewrite?.rewrites).toEqual(
        expect.arrayContaining([
          {
            filePath: '/src/wildcard_consumer.js',
            original: {
              filePath: '/src/wildcard_barrel.js',
              itemName: 'alpha',
            },
            target: {
              filePath: '/src/wildcard_source.js',
              itemName: 'alpha',
            },
          },
          {
            filePath: '/src/wildcard_consumer.js',
            original: {
              filePath: '/src/wildcard_barrel.js',
              itemName: 'beta',
            },
            target: {
              filePath: '/src/wildcard_source.js',
              itemName: 'beta',
            },
          },
        ])
      );
    });

    it('should resolve deep re-export chains', () => {
      setupFiles({
        '/src/deep4.js': `export const deepValue = 'found';`,
        '/src/deep3.js': `export { deepValue } from './deep4.js';`,
        '/src/deep2.js': `export { deepValue } from './deep3.js';`,
        '/src/deep1.js': `export { deepValue } from './deep2.js';`,
        '/src/deep_consumer.js': `import { deepValue } from './deep1.js'; export { deepValue };`,
      });

      const result = fileWalker.process('/src/deep_consumer.js', defaultTransformOptions)!;

      expect(result).toBeDefined();
      expect(result.rewrite?.rewrites).toEqual([
        {
          filePath: '/src/deep_consumer.js',
          original: {
            filePath: '/src/deep1.js',
            itemName: 'deepValue',
          },
          target: {
            filePath: '/src/deep4.js',
            itemName: 'deepValue',
          },
        },
      ]);

      const outputCode = formatAst(result.rewrite!.output);
      expect(outputCode).toBe(
        format(
          `import { deepValue } from "./deep4.js";
          export { deepValue };`
        )
      );
    });

    it('should handle mixed import/export patterns', () => {
      setupFiles({
        '/src/mixed_source.js': `export const named = 'named_value'; export default 'default_value';`,
        '/src/mixed_barrel.js': `export { named } from './mixed_source.js'; export { default } from './mixed_source.js';`,
        '/src/mixed_consumer.js': `import mixedDefault, { named } from './mixed_barrel.js'; export { named, mixedDefault };`,
      });

      const result = fileWalker.process('/src/mixed_consumer.js', defaultTransformOptions)!;

      expect(result).toBeDefined();
      expect(result.rewrite?.rewrites).toEqual(
        expect.arrayContaining([
          {
            filePath: '/src/mixed_consumer.js',
            original: {
              filePath: '/src/mixed_barrel.js',
              itemName: 'named',
            },
            target: {
              filePath: '/src/mixed_source.js',
              itemName: 'named',
            },
          },
          {
            filePath: '/src/mixed_consumer.js',
            original: {
              filePath: '/src/mixed_barrel.js',
              itemName: 'default',
            },
            target: {
              filePath: '/src/mixed_source.js',
              itemName: 'default',
            },
          },
        ])
      );

      const outputCode = formatAst(result.rewrite!.output);
      expect(outputCode).toBe(
        format(`import mixedDefault from "./mixed_source.js";
          import { named } from "./mixed_source.js";
          export { named, mixedDefault };`)
      );
    });

    it('should handle circular dependencies without infinite loops', () => {
      setupFiles({
        '/src/circular1.js': `export const func1 = () => {}; export { func2 } from "./circular2.js";`,
        '/src/circular2.js': `export const func2 = () => {}; export { func1 } from "./circular1.js";`,
        '/src/circular_consumer.js': `import { func1, func2 } from "./circular1.js"; export { func1, func2 };`,
      });

      const result = fileWalker.process('/src/circular_consumer.js', defaultTransformOptions)!;

      expect(result).toBeDefined();
      expect(result.rewrite?.path).toBe('/src/circular_consumer.js');

      const outputCode = formatAst(result.rewrite!.output);
      // Should complete processing without hanging
      expect(outputCode).toEqual(
        format(`
          import { func1 } from "./circular1.js";
          import { func2 } from "./circular2.js";
          export { func1, func2 };
        `)
      );
    });

    it('should not rewrite dynamic imports through barrel files', () => {
      setupFiles({
        '/src/dynamic_source.js': `export default asyncHelper = async () => 'async_result';`,
        '/src/dynamic_barrel.js': `import asyncHelperDefault from "./dynamic_source.js"; export default asyncHelperDefault;`,
        '/src/dynamic_consumer.js': `export const loadHelper = () => import("./dynamic_barrel.js");`,
      });

      const result = fileWalker.process('/src/dynamic_consumer.js', defaultTransformOptions)!;

      const outputCode = formatAst(result.rewrite!.output);
      expect(outputCode).toBe(
        format(`export const loadHelper = () => import("./dynamic_barrel.js");`)
      );

      expect(result).toBeDefined();
      expect(result.rewrite?.rewrites).toEqual([]);
    });

    it('should preserve side-effect imports without rewriting', () => {
      setupFiles({
        '/src/side_effect_module.js': `console.log('side effect executed');`,
        '/src/side_effect_consumer.js': `import './side_effect_module.js'; export const setup = () => {};`,
      });

      const result = fileWalker.process('/src/side_effect_consumer.js', defaultTransformOptions)!;

      expect(result).toBeDefined();
      expect(result.rewrite?.rewrites).toEqual([]);

      const outputCode = formatAst(result.rewrite!.output);
      expect(outputCode).toBe(`import './side_effect_module.js';
export const setup = () => {};`);
    });

    it('should handle renamed exports correctly', () => {
      setupFiles({
        '/src/rename_source.js': `export const original = 'source_value';`,
        '/src/rename_barrel.js': `export { original as renamed } from './rename_source.js';`,
        '/src/rename_consumer.js': `import { renamed } from './rename_barrel.js'; export { renamed };`,
      });

      const result = fileWalker.process('/src/rename_consumer.js', defaultTransformOptions)!;

      const outputCode = formatAst(result.rewrite!.output);
      expect(outputCode).toBe(
        format(
          `import { original as renamed } from "./rename_source.js";
          export { renamed };`
        )
      );

      expect(result).toBeDefined();
      expect(result.rewrite?.rewrites).toEqual([
        {
          filePath: '/src/rename_consumer.js',
          original: {
            filePath: '/src/rename_barrel.js',
            itemName: 'renamed',
          },
          target: {
            filePath: '/src/rename_source.js',
            itemName: 'original',
          },
        },
      ]);
    });

    it('should cache results for performance', () => {
      setupFiles({
        '/src/utils.js': `export const helper = () => 'original';`,
      });

      const result1 = fileWalker.process('/src/utils.js', defaultTransformOptions);
      const result2 = fileWalker.process('/src/utils.js', defaultTransformOptions);

      // Results should be identical (cached)
      expect(result1).toStrictEqual(result2);
    });

    it('should handle complex nested scenarios', () => {
      setupFiles({
        '/src/utils.js': `export const helper = () => 'original';`,
        '/src/barrel.js': `export { helper } from './utils.js';`,
        '/src/deep4.js': `export const deepValue = 'deep';`,
        '/src/deep3.js': `export { deepValue } from './deep4.js';`,
        '/src/deep2.js': `export { deepValue } from './deep3.js';`,
        '/src/deep1.js': `export { deepValue } from './deep2.js';`,
        '/src/wildcard_source.js': `export const alpha = 'a';`,
        '/src/wildcard_barrel.js': `export * from './wildcard_source.js';`,
        '/src/complex_consumer.js': `import { helper } from './barrel.js';\nimport { deepValue } from './deep1.js';\nimport { alpha } from './wildcard_barrel.js';\nexport { helper, deepValue, alpha };`,
      });

      const result = fileWalker.process('/src/complex_consumer.js', defaultTransformOptions)!;

      expect(result).toBeDefined();
      expect(result.rewrite?.rewrites.length).toBe(3); // All three imports should be rewritten

      const outputCode = formatAst(result.rewrite!.output);
      expect(outputCode).toContain('import { helper } from "./utils.js"');
      expect(outputCode).toContain('import { deepValue } from "./deep4.js"');
      expect(outputCode).toContain('import { alpha } from "./wildcard_source.js"');
    });
  });

  describe('integration tests', () => {
    it('should preserve original code structure and formatting', () => {
      const formattedCode = `
        // Comment before import
        import { helper } from './barrel.js'; // Inline comment
        
        /**
         * JSDoc comment
         */
        export const result = helper();
        
        /* Block comment */
        export default 'test';
      `;

      fileCache.set('/src/formatted_test.js', formattedCode);

      const result = fileWalker.process('/src/formatted_test.js', defaultTransformOptions)!;

      expect(result).toBeDefined();

      const outputCode = formatAst(result.rewrite!.output);

      // Should preserve comments and structure while rewriting imports
      expect(outputCode).toContain('// Comment before import');
      expect(outputCode).toContain('// Inline comment');
      expect(outputCode).toContain('/**');
      expect(outputCode).toContain('JSDoc comment');
      expect(outputCode).toContain('/* Block comment */');
      expect(outputCode).toContain('import { helper } from "./utils.js"');
    });

    it('should handle error cases', () => {
      // Test with missing file
      expect(() => {
        fileWalker.process('/src/missing.js', defaultTransformOptions);
      }).toThrow('Could not read file /src/missing.js');

      // Test with invalid import
      const invalidCode = `import { missing } from './nonexistent.js'; missing;`;
      fileCache.set('/src/invalid_test.js', invalidCode);

      expect(() => {
        fileWalker.process('/src/invalid_test.js', defaultTransformOptions);
      }).toThrow();
    });
  });
});
