/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format } from '../../common/test_helpers';
import { createRequireExpressionVisitor } from './require_expression';
import { createMockVisitorContext, parseAndTraverse } from './test_helpers';

describe('createRequireExpressionVisitor', () => {
  it('should handle plain require calls without rewrite', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createRequireExpressionVisitor(mockContext);

    const code = `const mod = require('./module');`;
    const result = parseAndTraverse(code, { RequireExpression: visitor });

    expect(result.code).toBe(format(`const mod = require('./module');`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './module',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should rewrite require calls when rewrite is available', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './module',
        targetSpecifier: './rewritten-module',
      },
    ]);
    const visitor = createRequireExpressionVisitor(mockContext);

    const code = `const mod = require('./module');`;
    const result = parseAndTraverse(code, { RequireExpression: visitor });

    expect(result.code).toBe(format(`const mod = require("./rewritten-module");`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple require calls', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './module1',
        targetSpecifier: './rewritten-module1',
      },
    ]);
    const visitor = createRequireExpressionVisitor(mockContext);

    const code = `
      const mod1 = require('./module1');
      const mod2 = require('./module2');
    `;
    const result = parseAndTraverse(code, { RequireExpression: visitor });

    expect(result.code).toContain(`require("./rewritten-module1")`);
    expect(result.code).toContain(`require('./module2')`);
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
  });

  it('should handle require calls in expressions', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './utils',
        targetSpecifier: './rewritten-utils',
      },
    ]);
    const visitor = createRequireExpressionVisitor(mockContext);

    const code = `const result = require('./utils').someFunction();`;
    const result = parseAndTraverse(code, { RequireExpression: visitor });

    expect(result.code).toBe(format(`const result = require("./rewritten-utils").someFunction();`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
  });

  it('should ignore require calls with non-string arguments', () => {
    const mockContext = createMockVisitorContext();
    const visitor = createRequireExpressionVisitor(mockContext);

    const code = `
      const mod1 = require(dynamicPath);
      const mod2 = require(123);
    `;
    const result = parseAndTraverse(code, { RequireExpression: visitor });

    expect(result.code).toContain(`require(dynamicPath)`);
    expect(result.code).toContain(`require(123)`);
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
    const visitor = createRequireExpressionVisitor(mockContext);

    const code = `const pkg = require('@scope/package');`;
    const result = parseAndTraverse(code, { RequireExpression: visitor });

    expect(result.code).toBe(format(`const pkg = require("@scope/rewritten-package");`));
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      '@scope/package',
      expect.any(Function)
    );
  });

  it('should handle require calls with complex expressions', () => {
    const mockContext = createMockVisitorContext([
      {
        itemName: 'default',
        specifier: './config',
        targetSpecifier: './rewritten-config',
      },
      {
        itemName: 'default',
        specifier: './handlers',
        targetSpecifier: './rewritten-handlers',
      },
      {
        itemName: 'default',
        specifier: './default-handler',
        targetSpecifier: './rewritten-default-handler',
      },
    ]);
    const visitor = createRequireExpressionVisitor(mockContext);

    const code = `
      const config = require('./config')[environment];
      const handler = require('./handlers')[type] || require('./default-handler');
    `;
    const result = parseAndTraverse(code, { RequireExpression: visitor });

    expect(result.code).toBe(
      format(`
        const config = require("./rewritten-config")[environment];
        const handler = require("./rewritten-handlers")[type] || require("./rewritten-default-handler");
      `)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(3);
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './config',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './handlers',
      expect.any(Function)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
      'default',
      './default-handler',
      expect.any(Function)
    );
  });

  it('should handle nested require calls', () => {
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
    const visitor = createRequireExpressionVisitor(mockContext);

    const code = `const result = require('./outer')(require('./inner'));`;
    const result = parseAndTraverse(code, { RequireExpression: visitor });

    expect(result.code).toBe(
      format(`const result = require("./rewritten-outer")(require("./rewritten-inner"));`)
    );
    expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
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
  });

  describe('comprehensive rename and edge case scenarios', () => {
    it('should handle require expressions with relative paths', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: '../utils/helper',
          targetSpecifier: '../optimized/helper',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `const helper = require('../utils/helper');`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(format(`const helper = require("../optimized/helper");`));
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        '../utils/helper',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle scoped package requires with rewrites', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: '@company/old-ui',
          targetSpecifier: '@company/new-ui',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `const ui = require('@company/old-ui');`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(format(`const ui = require("@company/new-ui");`));
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledWith(
        'default',
        '@company/old-ui',
        expect.any(Function)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle deeply nested path requires', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './src/components/ui/buttons/primary',
          targetSpecifier: './lib/ui/primary-button',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `const PrimaryButton = require('./src/components/ui/buttons/primary');`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(format(`const PrimaryButton = require("./lib/ui/primary-button");`));
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle require expressions with special characters in paths', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './module-with-dash_and_underscore',
          targetSpecifier: './optimized.module.with.dots',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `const specialModule = require('./module-with-dash_and_underscore');`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(`const specialModule = require("./optimized.module.with.dots");`)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle require expressions in function parameters', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './validator',
          targetSpecifier: './optimized-validator',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `function processData(data, validator = require('./validator')) { return validator(data); }`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(
          `function processData(data, validator = require("./optimized-validator")) { return validator(data); }`
        )
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle require expressions in arrow functions', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './processor',
          targetSpecifier: './optimized-processor',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `const process = (data) => require('./processor')(data);`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(`const process = (data) => require("./optimized-processor")(data);`)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle require expressions in object methods', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './utils',
          targetSpecifier: './optimized-utils',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `const obj = { process() { return require('./utils').format(); } };`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(`const obj = { process() { return require("./optimized-utils").format(); } };`)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle require expressions in class methods', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './logger',
          targetSpecifier: './optimized-logger',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `class Service { log(message) { require('./logger').info(message); } }`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(`class Service { log(message) { require("./optimized-logger").info(message); } }`)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle require expressions in try-catch blocks', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './optional-module',
          targetSpecifier: './optimized-optional',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `try { const mod = require('./optional-module'); } catch (e) { console.error(e); }`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(
          `try { const mod = require("./optimized-optional"); } catch (e) { console.error(e); }`
        )
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle require expressions in conditional statements', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './dev-tools',
          targetSpecifier: './optimized-dev-tools',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `const tools = process.env.NODE_ENV === 'development' ? require('./dev-tools') : null;`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(
          `const tools = process.env.NODE_ENV === 'development' ? require("./optimized-dev-tools") : null;`
        )
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle chained require expressions', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './config',
          targetSpecifier: './optimized-config',
        },
        {
          itemName: 'default',
          specifier: './utils',
          targetSpecifier: './optimized-utils',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `
        const config = require('./config');
        const utils = require('./utils');
        const result = utils.process(config.data);
      `;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(`
          const config = require("./optimized-config");
          const utils = require("./optimized-utils");
          const result = utils.process(config.data);
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle require expressions with complex call chains', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './api',
          targetSpecifier: './optimized-api',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `const data = require('./api').client.get('/users').then(response => response.data);`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(
          `const data = require("./optimized-api").client.get('/users').then(response => response.data);`
        )
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle require expressions in array and object literals', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './handler1',
          targetSpecifier: './optimized-handler1',
        },
        {
          itemName: 'default',
          specifier: './handler2',
          targetSpecifier: './optimized-handler2',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `const handlers = [require('./handler1'), require('./handler2')];`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(
          `const handlers = [require("./optimized-handler1"), require("./optimized-handler2")];`
        )
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });

    it('should handle require expressions with template literals (non-string specifiers)', () => {
      const mockContext = createMockVisitorContext();
      const visitor = createRequireExpressionVisitor(mockContext);

      // Template literals and dynamic requires should not be rewritten
      const code = `const mod = require(\`./module-\${name}\`);`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(format(code));
      expect(mockContext.withEdgeRewrite).not.toHaveBeenCalled();
    });

    it('should handle require expressions in immediate function calls', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './init',
          targetSpecifier: './optimized-init',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `(function() { require('./init')(); })();`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(format(`(function() { require("./optimized-init")(); })();`));
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle require expressions with computed property access', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './modules',
          targetSpecifier: './optimized-modules',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `const handler = require('./modules')[handlerName];`;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(`const handler = require("./optimized-modules")[handlerName];`)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(1);
    });

    it('should handle require expressions in complex nested scenarios', () => {
      const mockContext = createMockVisitorContext([
        {
          itemName: 'default',
          specifier: './middleware',
          targetSpecifier: './optimized-middleware',
        },
        {
          itemName: 'default',
          specifier: './routes',
          targetSpecifier: './optimized-routes',
        },
      ]);
      const visitor = createRequireExpressionVisitor(mockContext);

      const code = `
        const app = {
          use: (middleware) => middleware,
          get: (path, handler) => handler
        };
        app.use(require('./middleware'));
        app.get('/api', require('./routes').handler);
      `;
      const result = parseAndTraverse(code, { RequireExpression: visitor });

      expect(result.code).toBe(
        format(`
          const app = {
            use: (middleware) => middleware,
            get: (path, handler) => handler
          };
          app.use(require("./optimized-middleware"));
          app.get('/api', require("./optimized-routes").handler);
        `)
      );
      expect(mockContext.withEdgeRewrite).toHaveBeenCalledTimes(2);
    });
  });
});
