/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { format } from '../../common/test_helpers';
import { createDynamicImportDeclarationVisitor } from './dynamic_import_declaration';
import { createMockVisitorContext, parseAndTraverse } from './test_helpers';

describe('createDynamicImportDeclarationVisitor', () => {
  it('should handle destructured dynamic import without rewrite', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const { foo, bar } = await import('./module');`;
    const result = parseAndTraverse(
      code,
      { DynamicImportDeclaration: visitor },
      { filename: 'foo.js' }
    );

    expect(result.code).toBe(
      format(`const [{
      foo
      }, {
      bar
      }] = await Promise.all([ import("./module"), import("./module") ]);`)
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
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should rewrite destructured dynamic import when rewrite is available', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'foo',
        specifier: './module',
        targetSpecifier: './rewritten_module',
        exportedItemName: 'foo',
      },
    ]);

    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const { foo, bar } = await import("./module");`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toBe(
      format(`const [{ foo }, { bar }]  = await Promise.all([
        import("./rewritten_module"),
        import("./module")
      ]);`)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should handle single property destructuring', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'helper',
        specifier: './utils',
        targetSpecifier: './rewritten-utils',
      },
    ]);
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const { helper } = await import("./utils");`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toBe(format(`const { helper } = await import("./rewritten-utils");`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'helper',
      './utils',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle renamed destructuring', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const { foo: localFoo, bar: localBar } = await import("./module");`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toBe(
      format(
        `const [{ foo: localFoo}, {bar: localBar }] = await Promise.all([import("./module"), import("./module") ]);`
      )
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
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should handle multiple variable declarations', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'foo',
        specifier: './module1',
        targetSpecifier: './rewritten-module1',
      },
    ]);
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `
      const { foo } = await import("./module1");
      const { bar } = await import("./module2");
    `;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toEqual(
      format(`
      const { foo } = await import("./rewritten-module1");
      const { bar } = await import("./module2");
    `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should handle default imports in destructuring', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const { default: mod, helper } = await import("./module");`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toBe(
      format(
        `const [{ default: mod }, { helper }] = await Promise.all([import("./rewritten-module"), import("./module")]);`
      )
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'helper',
      './module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should handle default values in destructuring', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const { foo = 'default', bar } = await import("./module");`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toBe(
      format(
        `const [{ foo = 'default' }, { bar }] = await Promise.all([import("./module"), import("./module")]);`
      )
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
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should ignore non-destructured dynamic import declarations', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const mod = await import("./module");`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toBe(format(`const mod = await import("./module");`));
    expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
  });

  it('should ignore dynamic imports with non-string arguments', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const { foo } = await import(dynamicPath);`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toBe(format(`const { foo } = await import(dynamicPath);`));
    expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
  });

  it('should handle scoped packages in destructuring', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'util',
        specifier: '@scope/package',
        targetSpecifier: '@scope/rewritten-package',
      },
    ]);
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const { util, helper } = await import("@scope/package");`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toBe(
      format(
        `const [{ util }, { helper }] = await Promise.all([import("@scope/rewritten-package"), import("@scope/package")]);`
      )
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'util',
      '@scope/package',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'helper',
      '@scope/package',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should handle mixed destructuring and assignment patterns', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const { foo, bar: localBar, baz = 'default' } = await import("./module");`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toBe(
      format(
        `const [{ foo }, { bar: localBar }, { baz = 'default' }] = await Promise.all([
          import("./module"),
          import("./module"),
          import("./module")
        ]);`
      )
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

  it('should handle dynamic imports in promise chains with destructuring', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `
      import("./async-module").then(async ({ processor, helper }) => {
        return processor(helper);
      });
    `;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    // The destructuring happens inside the .then() callback, not at the variable declaration level,
    // so this visitor correctly does not process it. This is expected behavior.
    expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
    expect(result.code).toContain('import("./async-module")');
  });

  it('should handle empty destructuring gracefully', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const {} = await import("./module");`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    expect(result.code).toBe(format(`const {} = await import("./module");`));
    expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
  });

  it('should handle dynamic imports without await keyword', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportDeclarationVisitor(mockContext);

    const code = `const { foo } = import("./module");`;
    const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

    // Non-awaited destructured dynamic imports should be handled by DynamicImportExpression visitor
    // according to the dependency resolver dispatch logic, so this visitor correctly does not process them
    expect(result.code).toBe(format(`const { foo } = import("./module");`));
    expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
  });

  describe('rename scenarios with rewrites', () => {
    it('should handle single property rename with rewrite', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'foo',
          specifier: './module',
          targetSpecifier: './rewritten-module',
        },
      ]);
      const visitor = createDynamicImportDeclarationVisitor(mockContext);

      const code = `const { foo: renamedFoo } = await import("./module");`;
      const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

      expect(result.code).toBe(
        format(`const { foo: renamedFoo } = await import("./rewritten-module");`)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'foo',
        './module',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed renames with partial rewrites', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'foo',
          specifier: './module',
          targetSpecifier: './rewritten-foo',
        },
      ]);
      const visitor = createDynamicImportDeclarationVisitor(mockContext);

      const code = `const { foo: renamedFoo, bar: renamedBar } = await import("./module");`;
      const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

      expect(result.code).toBe(
        format(
          `const [{ foo: renamedFoo }, { bar: renamedBar }] = await Promise.all([
            import("./rewritten-foo"),
            import("./module")
          ]);`
        )
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
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle default import rename with rewrite', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './module',
          targetSpecifier: './rewritten-module',
        },
      ]);
      const visitor = createDynamicImportDeclarationVisitor(mockContext);

      const code = `const { default: myDefault } = await import("./module");`;
      const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

      expect(result.code).toBe(
        format(`const { default: myDefault } = await import("./rewritten-module");`)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './module',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle complex rename scenarios with default values and rewrites', () => {
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
      const visitor = createDynamicImportDeclarationVisitor(mockContext);

      const code = `const { foo: renamedFoo, bar: renamedBar = 'default', baz: renamedBaz } = await import("./module");`;
      const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

      expect(result.code).toBe(
        format(
          `const [
            { foo: renamedFoo },
            { bar: renamedBar = 'default' },
            { baz: renamedBaz }
          ] = await Promise.all([
            import("./rewritten-foo"),
            import("./module"),
            import("./rewritten-baz")
          ]);`
        )
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

    it('should handle rename scenarios with non-awaited dynamic imports', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'helper',
          specifier: './utils',
          targetSpecifier: './rewritten-utils',
        },
      ]);
      const visitor = createDynamicImportDeclarationVisitor(mockContext);

      const code = `const { helper: myHelper, other: myOther } = await import("./utils");`;
      const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

      expect(result.code).toBe(
        format(
          `const [{ helper: myHelper }, { other: myOther }] = await Promise.all([
            import("./rewritten-utils"),
            import("./utils")
          ]);`
        )
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'helper',
        './utils',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'other',
        './utils',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should preserve rename syntax in multi-specifier case', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createDynamicImportDeclarationVisitor(mockContext);

      const code = `const { originalName: newName, anotherOriginal: anotherNew } = await import("./module");`;
      const result = parseAndTraverse(code, { DynamicImportDeclaration: visitor });

      // Verify that the original rename syntax is preserved in the generated Promise.all pattern
      expect(result.code).toContain('originalName: newName');
      expect(result.code).toContain('anotherOriginal: anotherNew');
      expect(result.code).toBe(
        format(
          `const [{ originalName: newName }, { anotherOriginal: anotherNew }] = await Promise.all([
            import("./module"),
            import("./module")
          ]);`
        )
      );

      // Verify that the visitor looks up rewrites using the original imported names
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'originalName',
        './module',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'anotherOriginal',
        './module',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });
  });
});
