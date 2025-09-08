/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format } from '../../common/test_helpers';
import { createDynamicImportExpressionVisitor } from './dynamic_import_expression';
import { createMockVisitorContext, parseAndTraverse } from './test_helpers';

describe('createDynamicImportExpressionVisitor', () => {
  it('should handle plain dynamic import calls without rewrite', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `const mod = await import('./module');`;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toBe(format(`const mod = await import('./module');`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should rewrite dynamic import calls when rewrite is available', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `const mod = await import('./module');`;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toBe(format(`const mod = await import("./rewritten-module");`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple dynamic import calls', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './module1',
        targetSpecifier: './rewritten-module1',
      },
    ]);
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `
      const mod1 = await import('./module1');
      const mod2 = await import('./module2');
    `;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toContain(`import("./rewritten-module1")`);
    expect(result.code).toContain(`import('./module2')`);
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should handle dynamic imports in expressions', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './utils',
        targetSpecifier: './rewritten-utils',
      },
    ]);
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `const result = (await import('./utils')).someFunction();`;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toBe(
      format(`const result = (await import("./rewritten-utils")).someFunction();`)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should ignore dynamic imports with non-string arguments', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `
      const mod1 = await import(dynamicPath);
      const mod2 = await import(123);
    `;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toContain(`import(dynamicPath)`);
    expect(result.code).toContain(`import(123)`);
    expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
  });

  it('should handle scoped packages', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: '@scope/package',
        targetSpecifier: '@scope/rewritten-package',
      },
    ]);
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `const pkg = await import('@scope/package');`;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toBe(format(`const pkg = await import("@scope/rewritten-package");`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      '@scope/package',
      expect.any(Function)
    );
  });

  it('should handle dynamic imports in promise chains', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './handler',
        targetSpecifier: './rewritten-handler',
      },
    ]);
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `
      import('./handler')
        .then(module => module.default())
        .catch(err => console.error(err));
    `;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toContain(`import("./rewritten-handler")`);
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle conditional dynamic imports', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './dev-tools',
        targetSpecifier: './rewritten-dev-tools',
      },
    ]);
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `
      if (process.env.NODE_ENV === 'development') {
        const devTools = await import('./dev-tools');
      }
    `;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toContain(`import("./rewritten-dev-tools")`);
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle dynamic imports with then/catch', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `
      import('./module')
        .then(({ default: mod, helper }) => {
          // use mod and helper
        });
    `;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toBe(
      format(`
        import('./module')
          .then(({ default: mod, helper }) => {
            // use mod and helper
          });
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle nested dynamic imports', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './outer',
        targetSpecifier: './rewritten-outer',
      },
      {
        itemName: 'default',
        specifier: './inner',
        targetSpecifier: './rewritten-inner',
      },
    ]);
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `
      const result = await import("./outer").then(async outer => {
        const inner = await import("./inner");
        return outer.process(inner);
      });
    `;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toContain(`import("./rewritten-outer")`);
    expect(result.code).toContain(`import("./rewritten-inner")`);
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should handle dynamic imports in array/object literals', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createDynamicImportExpressionVisitor(mockContext);

    const code = `
      const modules = [
        await import('./module1'),
        await import('./module2')
      ];
      const config = {
        handler: await import("./handler"),
        utils: await import("./utils")
      };
    `;
    const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

    expect(result.code).toBe(
      format(`
        const modules = [
          await import('./module1'),
          await import('./module2')
        ];
        const config = {
          handler: await import("./handler"),
          utils: await import("./utils")
        };
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(4);
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './module1',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './module2',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './handler',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './utils',
      expect.any(Function)
    );
  });

  describe('rename and edge case scenarios', () => {
    it('should handle module-level rewrites (whole module imports)', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './old-module',
          targetSpecifier: './new-module',
        },
      ]);
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `const modulePromise = import('./old-module');`;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(format(`const modulePromise = import("./new-module");`));
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './old-module',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle chained dynamic imports with different rewrites', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './module-a',
          targetSpecifier: './rewritten-a',
        },
        {
          itemName: 'default',
          specifier: './module-b',
          targetSpecifier: './rewritten-b',
        },
      ]);
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `
        Promise.all([
          import("./module-a"),
          import("./module-b"),
          import("./module-c")
        ]);
      `;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(
        format(`
          Promise.all([
            import("./rewritten-a"),
            import("./rewritten-b"),
            import("./module-c")
          ]);
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
    });

    it('should handle dynamic imports in complex expressions', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './utils',
          targetSpecifier: './rewritten-utils',
        },
      ]);
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `
        const result = await import("./utils").then(mod => mod.process());
      `;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(
        format(`const result = await import("./rewritten-utils").then(mod => mod.process());`)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './utils',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle dynamic imports in arrow functions', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './loader',
          targetSpecifier: './optimized-loader',
        },
      ]);
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `const loadModule = () => import("./loader");`;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(format(`const loadModule = () => import("./optimized-loader");`));
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './loader',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle dynamic imports in object methods', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './handler',
          targetSpecifier: './optimized-handler',
        },
      ]);
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `
        const api = {
          load: () => import("./handler"),
          process: async function() {
            return await import("./handler");
          }
        };
      `;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(
        format(`
          const api = {
            load: () => import("./optimized-handler"),
            process: async function() {
              return await import("./optimized-handler");
            }
          };
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './handler',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle nested dynamic imports with partial rewrites', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './outer',
          targetSpecifier: './rewritten-outer',
        },
      ]);
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `
        import('./outer').then(outer => 
          outer.needsInner ? import("./inner") : null
        );
      `;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(
        format(`
          import("./rewritten-outer").then(outer => 
            outer.needsInner ? import("./inner") : null
          );
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './outer',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './inner',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle scoped package rewrites', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: '@company/old-package',
          targetSpecifier: '@company/new-package',
        },
      ]);
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `const pkg = await import('@company/old-package');`;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(format(`const pkg = await import("@company/new-package");`));
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        '@company/old-package',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle relative path rewrites correctly', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: '../utils/helper',
          targetSpecifier: '../optimized/helper',
        },
        {
          itemName: 'default',
          specifier: './local-module',
          targetSpecifier: './optimized-local',
        },
      ]);
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `
        const helpers = await import('../utils/helper');
        const local = await import('./local-module');
      `;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(
        format(`
          const helpers = await import("../optimized/helper");
          const local = await import("./optimized-local");
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should ignore dynamic imports with non-string literals', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `
        const dynamicPath = './module';
        const template = \`./\${type}-module\`;
        const computed = await import(dynamicPath);
        const templated = await import(template);
        const expression = await import('./base' + suffix);
      `;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      // Should not modify any of these since they're not string literals
      expect(result.code).toBe(format(code));
      expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
    });

    it('should handle dynamic imports in try-catch blocks', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './fallback',
          targetSpecifier: './optimized-fallback',
        },
      ]);
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `
        try {
          const primary = await import("./primary");
        } catch (error) {
          const fallback = await import("./fallback");
        }
      `;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(
        format(`
          try {
            const primary = await import("./primary");
          } catch (error) {
            const fallback = await import("./optimized-fallback");
          }
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './primary',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './fallback',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle dynamic imports in class methods', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './plugin',
          targetSpecifier: './optimized-plugin',
        },
      ]);
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `
        class ModuleLoader {
          async loadPlugin() {
            return await import("./plugin");
          }
          
          static getUtilities = () => import("./utilities");
        }
      `;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(
        format(`
          class ModuleLoader {
            async loadPlugin() {
              return await import("./optimized-plugin");
            }
            
            static getUtilities = () => import("./utilities");
          }
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './plugin',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        './utilities',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle empty string imports gracefully', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createDynamicImportExpressionVisitor(mockContext);

      const code = `const empty = await import('');`;
      const result = parseAndTraverse(code, { DynamicImportExpression: visitor });

      expect(result.code).toBe(format(`const empty = await import('');`));
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith('default', '', expect.any(Function));
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });
  });
});
