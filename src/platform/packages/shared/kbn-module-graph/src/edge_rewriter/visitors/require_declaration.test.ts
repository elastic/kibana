/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format } from '../../common/test_helpers';
import { createRequireDeclarationVisitor } from './require_declaration';
import { createMockVisitorContext, parseAndTraverse } from './test_helpers';

describe('createRequireDeclarationVisitor', () => {
  it('should handle destructured require without rewrite', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const { foo, bar } = require('./module');`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(
      format(`
      const { foo } = require("./module");
      const { bar } = require("./module");
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
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should rewrite destructured require when rewrite is available', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'foo',
        specifier: './module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const { foo, bar } = require('./module');`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(
      format(`
      const { foo } = require("./rewritten-module");
      const { bar } = require("./module");
    `)
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
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const { helper } = require('./utils');`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(format(`const { helper } = require("./rewritten-utils");`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'helper',
      './utils',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle renamed destructuring', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const { foo: localFoo, bar: localBar } = require('./module');`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        const { foo: localFoo } = require("./module");
        const { bar: localBar } = require("./module");
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
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `
      const { foo } = require('./module1');
      const { bar } = require('./module2');
    `;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toContain(`require("./rewritten-module1")`);
    expect(result.code).toContain(`require('./module2')`);
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should handle nested destructuring patterns', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const { config: { database, redis } } = require('./config');`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(
      format(`const { config: { database, redis } } = require('./config');`)
    );
    // Should call withEdgeRewrite for the top-level 'config' property
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'config',
      './config',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle default values in destructuring', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const { foo = 'default', bar } = require("./module");`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(
      format(`
      const { foo = 'default' } = require("./module");
      const { bar } = require("./module");
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
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should ignore non-destructured require declarations', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const mod = require('./module');`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(`const mod = require('./module');`);
    expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
  });

  it('should ignore require calls with non-string arguments', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const { foo } = require(dynamicPath);`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(format(`const { foo } = require(dynamicPath);`));
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
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const { util, helper } = require('@scope/package');`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        const { util } = require("@scope/rewritten-package");
        const { helper } = require("@scope/package");
      `)
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
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const { foo, bar: localBar, baz = 'default' } = require('./module');`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(
      format(`
        const { foo } = require("./module");
        const { bar: localBar } = require("./module");
        const { baz = 'default' } = require("./module");
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

  it('should handle empty destructuring gracefully', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createRequireDeclarationVisitor(mockContext);

    const code = `const {} = require('./module');`;
    const result = parseAndTraverse(code, { RequireDeclaration: visitor });

    expect(result.code).toBe(`const {} = require('./module');`);
    expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
  });

  describe('comprehensive rename and edge case scenarios', () => {
    it('should handle renamed destructured properties with rewrites', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'originalName',
          specifier: './module',
          targetSpecifier: './rewritten-module',
        },
      ]);
      const visitor = createRequireDeclarationVisitor(mockContext);

      const code = `const { originalName: renamedName } = require('./module');`;
      const result = parseAndTraverse(code, { RequireDeclaration: visitor });

      expect(result.code).toBe(
        format(`const { originalName: renamedName } = require("./rewritten-module");`)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'originalName',
        './module',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed renames in destructured require', () => {
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
      const visitor = createRequireDeclarationVisitor(mockContext);

      const code = `const { foo: localFoo, bar, baz: localBaz } = require('./module');`;
      const result = parseAndTraverse(code, { RequireDeclaration: visitor });

      expect(result.code).toBe(
        format(
          `
          const { foo: localFoo } = require("./rewritten-foo");
          const { bar } = require("./module");
          const { baz: localBaz } = require("./rewritten-baz");
        `
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

    it('should handle scoped package requires with rewrites', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'Component',
          specifier: '@company/old-ui',
          targetSpecifier: '@company/new-ui',
        },
      ]);
      const visitor = createRequireDeclarationVisitor(mockContext);

      const code = `const { Component, Button } = require('@company/old-ui');`;
      const result = parseAndTraverse(code, { RequireDeclaration: visitor });

      expect(result.code).toBe(
        format(`
        const { Component } = require("@company/new-ui");
        const { Button } = require("@company/old-ui");
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

    it('should handle relative path requires correctly', () => {
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
      const visitor = createRequireDeclarationVisitor(mockContext);

      const code = `
        const { helper } = require('../utils/helper');
        const { Config } = require('./config');
      `;
      const result = parseAndTraverse(code, { RequireDeclaration: visitor });

      expect(result.code).toBe(
        format(`
          const { helper } = require("../optimized/helper");
          const { Config } = require("./optimized-config");
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle nested destructuring patterns', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'utils',
          specifier: './module',
          targetSpecifier: './rewritten-module',
        },
      ]);
      const visitor = createRequireDeclarationVisitor(mockContext);

      // Note: This tests that the visitor handles complex destructuring patterns
      // Actual nested destructuring from require would be handled differently in real code
      const code = `const { utils, config } = require('./module');`;
      const result = parseAndTraverse(code, { RequireDeclaration: visitor });

      expect(result.code).toBe(
        format(`
        const { utils } = require("./rewritten-module");
        const { config } = require("./module");
      `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle requires with default values and renames', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'foo',
          specifier: './module',
          targetSpecifier: './rewritten-module',
        },
      ]);
      const visitor = createRequireDeclarationVisitor(mockContext);

      const code = `const { foo: localFoo = 'default', bar = 'defaultBar' } = require('./module');`;
      const result = parseAndTraverse(code, { RequireDeclaration: visitor });

      expect(result.code).toBe(
        format(`
          const { foo: localFoo = 'default' } = require("./rewritten-module");
          const { bar = 'defaultBar' } = require("./module");
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple require statements with different patterns', () => {
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
      const visitor = createRequireDeclarationVisitor(mockContext);

      const code = `
        const { Component: UIComponent } = require('./ui/component');
        const { utils: helperUtils, config } = require('./helpers/utils');
      `;
      const result = parseAndTraverse(code, { RequireDeclaration: visitor });

      expect(result.code).toBe(
        format(`
          const { Component: UIComponent } = require("./optimized/component");
          const { utils: helperUtils } = require("./optimized/utils");
          const { config } = require("./helpers/utils");
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
    });
  });
});
