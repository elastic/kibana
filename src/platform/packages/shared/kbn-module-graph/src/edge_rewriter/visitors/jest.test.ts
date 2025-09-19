/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@babel/parser';
import { traverse } from '@babel/core';
import { createJestVisitor } from './jest';
import { VisitorContext } from './types';
import { getDependencyTraverseOptions } from '../../traverse/get_dependency_traverse_options';
import { ItemName } from '../../edge_extractor/types';

describe('createJestVisitor', () => {
  function createTestCode(jestCode: string, leadingComment?: string): string {
    const comment = leadingComment ? `${leadingComment}\n` : '';
    return `${comment}${jestCode}`;
  }

  function testJestVisitor(
    code: string,
    rewriteMap: Record<string, { filePath: string; itemName: ItemName }> = {}
  ) {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    const visitorContext: VisitorContext = {
      withEdgeRewrite: (itemName, specifier, callback) => {
        const rewrite = rewriteMap[specifier];
        if (rewrite) {
          callback(rewrite);
        }
      },
    };

    const jestVisitor = createJestVisitor(visitorContext);

    const errors: Error[] = [];

    // Mock state for the visitor
    const mockState = {
      file: { code },
      filename: 'test.js',
    };

    traverse(ast, {
      ...getDependencyTraverseOptions({
        Jest: (path) => {
          try {
            // Set the state on the path for the visitor
            path.state = mockState;
            jestVisitor.call(mockState, path, mockState);
          } catch (error) {
            errors.push(error as Error);
          }
        },
        RequireDeclaration: () => {},
        DynamicImportDeclaration: () => {},
        RequireExpression: () => {},
        DynamicImportExpression: () => {},
        CommonJSExport: () => {},
        ImportDeclaration: () => {},
        ExportNamedDeclaration: () => {},
        ExportDefaultDeclaration: () => {},
        ExportAllDeclaration: () => {},
      }),
    });

    return errors;
  }

  describe('when rewrite is available', () => {
    it('should throw error for jest.mock with rewrite suggestion', () => {
      const code = createTestCode("jest.mock('./old-module');");
      const rewriteMap = {
        './old-module': { filePath: './new-module', itemName: null },
      };

      const errors = testJestVisitor(code, rewriteMap);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('should be updated to');
      expect(errors[0].message).toContain('./new-module');
      expect(errors[0].message).toContain('kbn-dependency-resolver:keep-jest-mock');

      expect(errors[0].message).toMatchInlineSnapshot(`
        "> 1 | jest.mock('./old-module');
            | ^^^^^^^^^^^^^^^^^^^^^^^^^ Jest mock for './old-module' should be updated to './new-module'. Consider updating the Jest mock to use the rewritten path:
          jest.mock('./new-module');

        Or if you need to keep the original mock, add this comment on the preceding line:
          // kbn-dependency-resolver:keep-jest-mock"
      `);
    });

    it('should throw error for jest.doMock', () => {
      const code = createTestCode("jest.doMock('./old-module');");
      const rewriteMap = {
        './old-module': { filePath: './new-module', itemName: null },
      };

      const errors = testJestVisitor(code, rewriteMap);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('should be updated to');
    });
  });

  describe('when no rewrite is available', () => {
    it('should not throw error for jest.mock without rewrite', () => {
      const code = createTestCode("jest.mock('./some-module');");
      const rewriteMap = {}; // No rewrites available

      const errors = testJestVisitor(code, rewriteMap);

      expect(errors).toHaveLength(0);
    });
  });

  describe('when opt-out comment is present', () => {
    it('should not throw error with single-line comment', () => {
      const code = createTestCode(
        "jest.mock('./old-module');",
        '// kbn-dependency-resolver:keep-jest-mock'
      );
      const rewriteMap = {
        './old-module': { filePath: './new-module', itemName: null },
      };

      const errors = testJestVisitor(code, rewriteMap);

      expect(errors).toHaveLength(0);
    });

    it('should not throw error with multi-line comment', () => {
      const code = createTestCode(
        "jest.mock('./old-module');",
        '/* kbn-dependency-resolver:keep-jest-mock */'
      );
      const rewriteMap = {
        './old-module': { filePath: './new-module', itemName: null },
      };

      const errors = testJestVisitor(code, rewriteMap);

      expect(errors).toHaveLength(0);
    });

    it('should throw error when comment does not contain exact opt-out pattern', () => {
      const code = createTestCode(
        "jest.mock('./old-module');",
        '// This is just a regular comment about keeping mocks'
      );
      const rewriteMap = {
        './old-module': { filePath: './new-module', itemName: null },
      };

      const errors = testJestVisitor(code, rewriteMap);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('should be updated to');
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple jest calls with different rewrite scenarios', () => {
      const code = `
        // kbn-dependency-resolver:keep-jest-mock
        jest.mock('./keep-this-one');
        jest.mock('./rewrite-this-one');
        jest.mock('./no-rewrite-available');
      `;
      const rewriteMap = {
        './keep-this-one': { filePath: './new-keep-module', itemName: null },
        './rewrite-this-one': { filePath: './new-rewrite-module', itemName: null },
        // './no-rewrite-available' - no rewrite available
      };

      const errors = testJestVisitor(code, rewriteMap);

      // Should only throw error for the second jest.mock call
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('./rewrite-this-one');
      expect(errors[0].message).toContain('./new-rewrite-module');
    });

    it('should include helpful code frame in error message', () => {
      const code = createTestCode("jest.mock('./old-module');");
      const rewriteMap = {
        './old-module': { filePath: './new-module', itemName: null },
      };

      const errors = testJestVisitor(code, rewriteMap);

      expect(errors).toHaveLength(1);
      // Should contain code frame with line numbers and highlighting
      expect(errors[0].message).toContain('./old-module');
      expect(errors[0].message).toContain('|');
    });
  });
});
