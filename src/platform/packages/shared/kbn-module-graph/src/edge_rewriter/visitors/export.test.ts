/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format } from '../../common/test_helpers';
import { createExportAllDeclarationVisitor, createExportNamedDeclarationVisitor } from './export';
import { createMockVisitorContext, parseAndTraverse } from './test_helpers';

describe('createExportAllDeclarationVisitor - Code Transformations', () => {
  it('should not rewrite export * when no rewrite is available', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createExportAllDeclarationVisitor(mockContext);

    const code = `export * from "./some-module";`;
    const result = parseAndTraverse(
      code,
      { ExportAllDeclaration: visitor },
      { filename: 'test.js' }
    );

    expect(result.code).toBe(format(`export * from "./some-module";`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      '*',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should rewrite export * when rewrite is available', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: '*',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createExportAllDeclarationVisitor(mockContext);

    const code = `export * from "./some-module";`;
    const result = parseAndTraverse(code, { ExportAllDeclaration: visitor });

    expect(result.code).toBe(format(`export * from "./rewritten-module";`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple export * statements with mixed rewrites', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: '*',
        specifier: './module-b',
        targetSpecifier: './rewritten-module-b',
      },
    ]);
    const visitor = createExportAllDeclarationVisitor(mockContext);

    const code = `
      export * from "./module-a";
      export * from "./module-b";
      export * from "./module-c";
    `;
    const result = parseAndTraverse(code, { ExportAllDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        export * from "./module-a";
        export * from "./rewritten-module-b";
        export * from "./module-c";
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
  });

  it('should handle scoped package exports', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: '*',
        specifier: '@scoped/package',
        targetSpecifier: '@scoped/rewritten-package',
      },
    ]);
    const visitor = createExportAllDeclarationVisitor(mockContext);

    const code = `export * from "@scoped/package";`;
    const result = parseAndTraverse(code, { ExportAllDeclaration: visitor });

    expect(result.code).toBe(format(`export * from "@scoped/rewritten-package";`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      '*',
      '@scoped/package',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });
});

describe('createExportNamedDeclarationVisitor - Code Transformations', () => {
  it('should not rewrite named exports when no rewrite is available', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createExportNamedDeclarationVisitor(mockContext);

    const code = `export { foo, bar } from "./some-module";`;
    const result = parseAndTraverse(
      code,
      { ExportNamedDeclaration: visitor },
      { filename: 'test.js' }
    );

    expect(result.code).toBe(
      format(`
        export { foo } from "./some-module";
        export { bar } from "./some-module";
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'foo',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'bar',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should rewrite specific named exports when rewrite is available', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'bar',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createExportNamedDeclarationVisitor(mockContext);

    const code = `export { foo, bar, baz } from "./some-module";`;
    const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        export { foo } from "./some-module";
        export { bar } from "./rewritten-module";
        export { baz } from "./some-module";
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
  });

  it('should handle single named export without splitting', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'singleItem',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createExportNamedDeclarationVisitor(mockContext);

    const code = `export { singleItem } from "./some-module";`;
    const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

    expect(result.code).toBe(format(`export { singleItem } from "./rewritten-module";`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'singleItem',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle export renames correctly', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'foo',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createExportNamedDeclarationVisitor(mockContext);

    const code = `export { foo as renamedFoo, bar } from "./some-module";`;
    const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        export { foo as renamedFoo } from "./rewritten-module";
        export { bar } from "./some-module";
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'foo',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'bar',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should ignore local exports (no source)', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createExportNamedDeclarationVisitor(mockContext);

    const code = `
      const foo = 1;
      const bar = 2;
      export { foo, bar };
    `;
    const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        const foo = 1;
        const bar = 2;
        export { foo, bar };
      `)
    );
    expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
  });

  it('should handle complex scoped package exports', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'Component',
        specifier: '@scoped/package/deep/path',
        targetSpecifier: '@scoped/rewritten-package/deep/path',
      },
    ]);
    const visitor = createExportNamedDeclarationVisitor(mockContext);

    const code = `export { Component, Helper } from "@scoped/package/deep/path";`;
    const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        export { Component } from "@scoped/rewritten-package/deep/path";
        export { Helper } from "@scoped/package/deep/path";
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'Component',
      '@scoped/package/deep/path',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'Helper',
      '@scoped/package/deep/path',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should handle mixed exports with some rewrites', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'util1',
        specifier: './utils',
        targetSpecifier: './rewritten-utils',
      },
      {
        itemName: 'util3',
        specifier: './utils',
        targetSpecifier: './other-rewritten-utils',
      },
    ]);
    const visitor = createExportNamedDeclarationVisitor(mockContext);

    const code = `export { util1, util2, util3, util4 } from "./utils";`;
    const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        export { util1 } from "./rewritten-utils";
        export { util2 } from "./utils";
        export { util3 } from "./other-rewritten-utils";
        export { util4 } from "./utils";
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(4);
  });

  it('should handle export namespace syntax', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: '*',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createExportNamedDeclarationVisitor(mockContext);

    // Note: export * as ns from 'module' uses ExportNamespaceSpecifier
    const code = `export * as ns from "./some-module";`;
    const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

    expect(result.code).toBe(format(`export * as ns from "./rewritten-module";`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      '*',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple export statements', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'foo',
        specifier: './module-a',
        targetSpecifier: './rewritten-module-a',
      },
      {
        itemName: 'baz',
        specifier: './module-b',
        targetSpecifier: './rewritten-module-b',
      },
    ]);
    const visitor = createExportNamedDeclarationVisitor(mockContext);

    const code = `
      export { foo, bar } from "./module-a";
      export { baz, qux } from "./module-b";
    `;
    const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        export { foo } from "./rewritten-module-a";
        export { bar } from "./module-a";
        export { baz } from "./rewritten-module-b";
        export { qux } from "./module-b";
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(4);
  });

  describe('comprehensive rename and edge case scenarios', () => {
    describe('ExportAllDeclaration edge cases', () => {
      it('should handle export all with relative paths', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: '*',
            specifier: '../utils/helpers',
            targetSpecifier: '../optimized/helpers',
          },
        ]);
        const visitor = createExportAllDeclarationVisitor(mockContext);

        const code = `export * from "../utils/helpers";`;
        const result = parseAndTraverse(code, { ExportAllDeclaration: visitor });

        expect(result.code).toBe(format(`export * from "../optimized/helpers";`));
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
          '*',
          '../utils/helpers',
          expect.any(Function)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
      });

      it('should handle export all with scoped packages', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: '*',
            specifier: '@company/old-lib',
            targetSpecifier: '@company/new-lib',
          },
        ]);
        const visitor = createExportAllDeclarationVisitor(mockContext);

        const code = `export * from "@company/old-lib";`;
        const result = parseAndTraverse(code, { ExportAllDeclaration: visitor });

        expect(result.code).toBe(format(`export * from "@company/new-lib";`));
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
      });

      it('should handle export all with deep nested paths', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: '*',
            specifier: './src/components/ui/buttons',
            targetSpecifier: './lib/ui/buttons',
          },
        ]);
        const visitor = createExportAllDeclarationVisitor(mockContext);

        const code = `export * from "./src/components/ui/buttons";`;
        const result = parseAndTraverse(code, { ExportAllDeclaration: visitor });

        expect(result.code).toBe(format(`export * from "./lib/ui/buttons";`));
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
      });

      it('should handle export all with special characters in path', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: '*',
            specifier: './module-with-dash_and_underscore',
            targetSpecifier: './optimized.module.with.dots',
          },
        ]);
        const visitor = createExportAllDeclarationVisitor(mockContext);

        const code = `export * from "./module-with-dash_and_underscore";`;
        const result = parseAndTraverse(code, { ExportAllDeclaration: visitor });

        expect(result.code).toBe(format(`export * from "./optimized.module.with.dots";`));
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
      });
    });

    describe('ExportNamedDeclaration rename scenarios', () => {
      it('should handle renamed exports with rewrites', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: 'originalName',
            specifier: './module',
            targetSpecifier: './rewritten-module',
          },
        ]);
        const visitor = createExportNamedDeclarationVisitor(mockContext);

        const code = `export { originalName as exportedName } from "./module";`;
        const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

        expect(result.code).toBe(
          format(`export { originalName as exportedName } from "./rewritten-module";`)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
          'originalName',
          './module',
          expect.any(Function)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
      });

      it('should handle mixed renames in multi-specifier exports', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: 'foo',
            specifier: './module',
            targetSpecifier: './rewritten-foo',
          },
          {
            itemName: 'baz',
            specifier: './module',
            targetSpecifier: './rewritten-baz',
          },
        ]);
        const visitor = createExportNamedDeclarationVisitor(mockContext);

        const code = `export { foo as exportedFoo, bar, baz as exportedBaz } from "./module";`;
        const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

        expect(result.code).toBe(
          format(`
            export { foo as exportedFoo } from "./rewritten-foo";
            export { bar } from "./module";
            export { baz as exportedBaz } from "./rewritten-baz";
          `)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
          'foo',
          './module',
          expect.any(Function)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
          'bar',
          './module',
          expect.any(Function)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
          'baz',
          './module',
          expect.any(Function)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
      });

      it('should handle default export renames', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: 'default',
            specifier: './module',
            targetSpecifier: './rewritten-module',
          },
        ]);
        const visitor = createExportNamedDeclarationVisitor(mockContext);

        const code = `export { default as MyDefault } from "./module";`;
        const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

        expect(result.code).toBe(
          format(`export { default as MyDefault } from "./rewritten-module";`)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
          'default',
          './module',
          expect.any(Function)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
      });

      it('should handle exports with special identifier names', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: '$special',
            specifier: './special-module',
            targetSpecifier: './rewritten-special',
          },
          {
            itemName: '_internal',
            specifier: './special-module',
            targetSpecifier: './rewritten-internal',
          },
        ]);
        const visitor = createExportNamedDeclarationVisitor(mockContext);

        const code = `export { $special, _internal, $123mixed } from "./special-module";`;
        const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

        expect(result.code).toBe(
          format(`
            export { $special } from "./rewritten-special";
            export { _internal } from "./rewritten-internal";
            export { $123mixed } from "./special-module";
          `)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
      });

      it('should handle complex export chains', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: 'Component',
            specifier: './ui/component',
            targetSpecifier: './optimized/component',
          },
          {
            itemName: 'utils',
            specifier: './helpers/utils',
            targetSpecifier: './optimized/utils',
          },
        ]);
        const visitor = createExportNamedDeclarationVisitor(mockContext);

        const code = `
          export { Component as UIComponent } from "./ui/component";
          export { utils as helperUtils, config } from "./helpers/utils";
        `;
        const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

        expect(result.code).toBe(
          format(`
            export { Component as UIComponent } from "./optimized/component";
            export { utils as helperUtils } from "./optimized/utils";
            export { config } from "./helpers/utils";
          `)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
      });

      it('should handle scoped package exports with complex paths', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: 'ThemeProvider',
            specifier: '@company/ui-lib/theme',
            targetSpecifier: '@company/new-ui/theme',
          },
          {
            itemName: 'Button',
            specifier: '@company/ui-lib/components',
            targetSpecifier: '@company/new-ui/components',
          },
        ]);
        const visitor = createExportNamedDeclarationVisitor(mockContext);

        const code = `
          export { ThemeProvider } from "@company/ui-lib/theme";
          export { Button, Input } from "@company/ui-lib/components";
        `;
        const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

        expect(result.code).toBe(
          format(`
            export { ThemeProvider } from "@company/new-ui/theme";
            export { Button } from "@company/new-ui/components";
            export { Input } from "@company/ui-lib/components";
          `)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
      });

      it('should handle exports from deep relative paths', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: 'deepFunction',
            specifier: '../../../shared/utils/deep/functions',
            targetSpecifier: '../../../optimized/functions',
          },
        ]);
        const visitor = createExportNamedDeclarationVisitor(mockContext);

        const code = `export { deepFunction, otherFunction } from "../../../shared/utils/deep/functions";`;
        const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

        expect(result.code).toBe(
          format(`
            export { deepFunction } from "../../../optimized/functions";
            export { otherFunction } from "../../../shared/utils/deep/functions";
          `)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
      });

      it('should handle exports with mixed patterns and no source rewrites', () => {
        const mockContext = createMockVisitorContext();
        const visitor = createExportNamedDeclarationVisitor(mockContext);

        const code = `
          export { namedExport } from "./module";
          export const localVar = 'value';
          export default function defaultFunc() {}
        `;
        const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

        // Only the export from should trigger withEdgeRewrite
        expect(result.code).toBe(format(code));
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
          'namedExport',
          './module',
          expect.any(Function)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
      });

      it('should handle very large multi-specifier exports', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: 'func1',
            specifier: './large-module',
            targetSpecifier: './optimized-func1',
          },
          {
            itemName: 'func3',
            specifier: './large-module',
            targetSpecifier: './optimized-func3',
          },
          {
            itemName: 'func5',
            specifier: './large-module',
            targetSpecifier: './optimized-func5',
          },
        ]);
        const visitor = createExportNamedDeclarationVisitor(mockContext);

        const code = `export { func1, func2, func3, func4, func5, func6 } from "./large-module";`;
        const result = parseAndTraverse(code, { ExportNamedDeclaration: visitor });

        expect(result.code).toBe(
          format(`
            export { func1 } from "./optimized-func1";
            export { func2 } from "./large-module";
            export { func3 } from "./optimized-func3";
            export { func4 } from "./large-module";
            export { func5 } from "./optimized-func5";
            export { func6 } from "./large-module";
          `)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(6);
      });

      it('should handle export all combined with named exports in different statements', () => {
        const mockContext = createMockVisitorContext([
          {
            itemName: '*',
            specifier: './base-module',
            targetSpecifier: './optimized-base',
          },
          {
            itemName: 'specific',
            specifier: './specific-module',
            targetSpecifier: './optimized-specific',
          },
        ]);
        const exportAllVisitor = createExportAllDeclarationVisitor(mockContext);
        const exportNamedVisitor = createExportNamedDeclarationVisitor(mockContext);

        const code = `
          export * from "./base-module";
          export { specific, general } from "./specific-module";
        `;
        const result = parseAndTraverse(code, {
          ExportAllDeclaration: exportAllVisitor,
          ExportNamedDeclaration: exportNamedVisitor,
        });

        expect(result.code).toBe(
          format(`
            export * from "./optimized-base";
            export { specific } from "./optimized-specific";
            export { general } from "./specific-module";
          `)
        );
        expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3); // *, specific, general
      });
    });
  });
});
