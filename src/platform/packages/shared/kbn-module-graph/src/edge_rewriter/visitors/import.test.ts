/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format } from '../../common/test_helpers';
import { createImportDeclarationVisitor } from './import';
import { createMockVisitorContext, parseAndTraverse } from './test_helpers';

describe('createImportDeclarationVisitor - Code Transformations', () => {
  it('should not rewrite default import when no rewrite is available', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import foo from "./some-module"; foo();`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor }, { filename: 'test.js' });

    expect(result.code).toBe(format(`import foo from "./some-module"; foo();`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should rewrite default import when rewrite is available', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import foo from "./some-module"; foo;`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor });

    expect(result.code).toBe(format(`import foo from "./rewritten-module"; foo;`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle named imports without rewrite (statement splitting)', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import { foo, bar } from "./some-module"; foo, bar;`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor }, { filename: 'test.js' });

    expect(result.code).toBe(
      format(`
        import { foo } from "./some-module";
        import { bar } from "./some-module";

        foo, bar;
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

  it('should rewrite specific named imports when rewrite is available', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'bar',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import { foo, bar, baz } from "./some-module"; foo, bar, baz;`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        import { foo } from "./some-module";
        import { bar } from "./rewritten-module";
        import { baz } from "./some-module";
        foo, bar, baz;
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
  });

  it('should handle single named import without splitting', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'singleItem',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import { singleItem } from "./some-module"; singleItem;`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor });

    expect(result.code).toBe(
      format(`import { singleItem } from "./rewritten-module"; singleItem;`)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'singleItem',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle namespace imports', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: '*',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import * as ns from "./some-module"; ns;`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor });

    expect(result.code).toBe(format(`import * as ns from "./rewritten-module"; ns;`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      '*',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle mixed imports (default + named)', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './some-module',
        targetSpecifier: './rewritten-default',
      },
      {
        itemName: 'bar',
        specifier: './some-module',
        targetSpecifier: './rewritten-bar',
      },
    ]);
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import foo, { bar, baz } from "./some-module"; foo, bar, baz;`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        import foo from "./rewritten-default";
        import { bar } from "./rewritten-bar";
        import { baz } from "./some-module";
        foo, bar, baz;
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
  });

  it('should ignore side-effect imports', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import "./some-module";`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor });

    expect(result.code).toBe(format(`import "./some-module";`));
    expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
  });

  it('should handle import renames correctly', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'foo',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import { foo as renamedFoo, bar } from "./some-module"; renamedFoo, bar;`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        import { foo as renamedFoo } from "./rewritten-module";
        import { bar } from "./some-module";
        renamedFoo, bar;
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

  it('should handle complex scoped package imports', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'Component',
        specifier: '@scoped/package/deep/path',
        targetSpecifier: '@scoped/rewritten-package/deep/path',
      },
    ]);
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import { Component, Helper } from "@scoped/package/deep/path"; Component, Helper;`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        import { Component } from "@scoped/rewritten-package/deep/path";
        import { Helper } from "@scoped/package/deep/path";
        Component, Helper;
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

  it('should handle string literal imports in named imports', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'foo-bar',
        specifier: './some-module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `import { "foo-bar" as fooBar } from "./some-module"; fooBar;`;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor });

    expect(result.code).toBe(
      format(`import { "foo-bar" as fooBar } from "./rewritten-module"; fooBar;`)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'foo-bar',
      './some-module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple import statements', () => {
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
    const visitor = createImportDeclarationVisitor(mockContext);

    const code = `
      import { foo, bar } from "./module-a"; foo, bar;
      import { baz, qux } from "./module-b"; baz, qux;
    `;
    const result = parseAndTraverse(code, { ImportDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        import { foo } from "./rewritten-module-a";
        import { bar } from "./module-a";
        foo, bar;
        import { baz } from "./rewritten-module-b";
        import { qux } from "./module-b";
        baz, qux;
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(4);
  });

  describe('comprehensive rename and edge case scenarios', () => {
    it('should handle renamed named imports with rewrites', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'originalName',
          specifier: './module',
          targetSpecifier: './rewritten-module',
        },
      ]);
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import { originalName as renamedName } from "./module"; renamedName;`;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(
        format(`import { originalName as renamedName } from "./rewritten-module"; renamedName;`)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'originalName',
        './module',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed renames in multi-specifier imports', () => {
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

      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import { foo as localFoo, bar, baz as localBaz } from "./module"; localFoo, bar, localBaz;`;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(
        format(`
          import { foo as localFoo } from "./rewritten-foo";
          import { bar } from "./module";
          import { baz as localBaz } from "./rewritten-baz";
          localFoo, bar, localBaz;
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

    it('should handle namespace imports with rewrites', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: '*',
          specifier: './utils',
          targetSpecifier: './optimized-utils',
        },
      ]);
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import * as utils from "./utils"; utils;`;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(format(`import * as utils from "./optimized-utils"; utils;`));
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        '*',
        './utils',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle default + namespace combination', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './module',
          targetSpecifier: './rewritten-default',
        },
        {
          itemName: '*',
          specifier: './utils',
          targetSpecifier: './rewritten-utils',
        },
      ]);
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `
        import defaultExport from "./module";
        import * as utils from "./utils";
        
        defaultExport, utils;
      `;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(
        format(`
          import defaultExport from "./rewritten-default";
          import * as utils from "./rewritten-utils";

          defaultExport, utils;
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle scoped package imports with rewrites', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'Component',
          specifier: '@company/old-ui',
          targetSpecifier: '@company/new-ui',
        },
      ]);
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import { Component, Button } from "@company/old-ui"; Component, Button;`;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(
        format(`
          import { Component } from "@company/new-ui";
          import { Button } from "@company/old-ui";
          Component, Button;
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'Component',
        '@company/old-ui',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'Button',
        '@company/old-ui',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle relative path imports correctly', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'helper',
          specifier: '../utils/helper',
          targetSpecifier: '../optimized/helper',
        },
        {
          itemName: 'Config',
          specifier: './config',
          targetSpecifier: './optimized-config',
        },
      ]);
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `
        import { helper } from "../utils/helper";
        import { Config } from "./config";
        helper, Config;
      `;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(
        format(`
          import { helper } from "../optimized/helper";
          import { Config } from "./optimized-config";
          helper, Config;
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should preserve side-effect imports without modification', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `
        import "./polyfills";
        import "@babel/polyfill";
        import "./styles.css";
      `;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      // Side-effect imports should remain unchanged
      expect(result.code).toBe(format(code));
      expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
    });

    it('should handle complex mixed import scenarios', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './primary',
          targetSpecifier: './optimized-primary',
        },
        {
          itemName: 'namedExport',
          specifier: './primary',
          targetSpecifier: './optimized-named',
        },
        {
          itemName: '*',
          specifier: './utils',
          targetSpecifier: './optimized-utils',
        },
      ]);
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `
        import primaryDefault, { namedExport, other as renamedOther } from "./primary";
        import * as utils from "./utils";
        import "./side-effect";

        primaryDefault, namedExport, renamedOther, utils;
      `;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(
        format(`
          import primaryDefault from "./optimized-primary";
          import { namedExport } from "./optimized-named";
          import { other as renamedOther } from "./primary";
          import * as utils from "./optimized-utils";
          import "./side-effect";

          primaryDefault, namedExport, renamedOther, utils;
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(4); // default, namedExport, other, *
    });

    it('should handle very large multi-specifier imports', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'func1',
          specifier: './large-module',
          targetSpecifier: './optimized-func1',
        },
        {
          itemName: 'func5',
          specifier: './large-module',
          targetSpecifier: './optimized-func5',
        },
      ]);
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import { func1, func2, func3, func4, func5, func6 } from "./large-module";
      func1, func2, func3, func4, func5, func6;
      `;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(
        format(`
          import { func1 } from "./optimized-func1";
          import { func2 } from "./large-module";
          import { func3 } from "./large-module";
          import { func4 } from "./large-module";
          import { func5 } from "./optimized-func5";
          import { func6 } from "./large-module";

          func1, func2, func3, func4, func5, func6;
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(6);
    });
  });

  describe('type-only imports are ignored', () => {
    it('ignores `import type` declarations', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import type { Foo } from "./some-module"; type X = Foo;`;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(format(code));
      expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
    });

    it('ignores specifiers that are all marked as type', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import { type Foo, type Bar } from "./some-module"; interface X extends Foo { bar: Bar }`;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(format(code));
      expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
    });

    it('ignores imports whose bindings are only used in type annotations', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import { Foo } from "./some-module"; const x: Foo = 1 as any;`;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(format(code));
      expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
    });

    it('ignores imports whose bindings are only used in implements clauses', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import { IFoo } from "./some-module"; class C implements IFoo {}`;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(format(code));
      expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
    });

    it('ignores default imports used only as types', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import DefaultThing from "./some-module"; let y: DefaultThing;`;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(format(code));
      expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
    });

    it('ignores namespace imports used only in type positions', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createImportDeclarationVisitor(mockContext);

      const code = `import * as NS from "./some-module"; type T = NS.Type;`;
      const result = parseAndTraverse(code, { ImportDeclaration: visitor });

      expect(result.code).toBe(format(code));
      expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
    });
  });
});
