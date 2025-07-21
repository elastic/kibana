/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BabelFileResult, transformFromAstSync, traverse } from '@babel/core';
import { parse } from '@babel/parser';
import { noop } from 'lodash';
import type { PluginState, VisitorContext } from './types';
import { DependencyTraverseOptions } from '../../traverse/types';
import { getDependencyTraverseOptions } from '../../traverse/get_dependency_traverse_options';
import { ItemName } from '../../edge_extractor/types';

/**
 * Test helper function that parses code and applies a visitor function to CommonJS export patterns
 * using the proper dependency resolver infrastructure.
 */
export function parseAndTraverse<S extends PluginState>(
  code: string,
  visitors: Partial<{
    [key in keyof DependencyTraverseOptions<S>]: DependencyTraverseOptions<S>[key];
  }>,
  state: S = { filename: 'my-filename.ts' } as S
): BabelFileResult {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript'],
    allowUndeclaredExports: true,
  });

  if (!ast) {
    throw new Error('Failed to parse code');
  }

  // Create traverse options using the dependency resolver's infrastructure
  const traverseOptions = getDependencyTraverseOptions({
    RequireDeclaration: noop,
    DynamicImportDeclaration: noop,
    DynamicImportExpression: noop,
    RequireExpression: noop,
    ExportAllDeclaration: noop,
    ExportDefaultDeclaration: noop,
    ExportNamedDeclaration: noop,
    ImportDeclaration: noop,
    Jest: noop,
    CommonJSExport: noop,
    ...visitors,
  });

  traverse<S>(ast, traverseOptions, undefined, state);

  const result = transformFromAstSync(ast, code);
  if (!result) {
    throw new Error('No result returned by Babel');
  }
  return result;
}

/**
 * Creates a mock visitor context with optional rewrite mappings
 */
export function createMockVisitorContext(
  mockRewrites: Array<{
    specifier: string;
    targetSpecifier: string;
    itemName: string;
    exportedItemName?: string;
  }> = []
): VisitorContext {
  const withEdgeRewrite = jest.fn(
    (
      itemName: ItemName,
      specifier: string,
      callback: (rewrite: { filePath: string; itemName: Exclude<ItemName, null> }) => void
    ) => {
      const rewrite = mockRewrites.find(
        (item) => item.itemName === itemName && item.specifier === specifier
      );

      if (rewrite) {
        callback({
          filePath: rewrite.targetSpecifier,
          itemName: rewrite.exportedItemName ?? rewrite.itemName,
        });
      }
    }
  );

  return {
    withEdgeRewrite,
  };
}

/**
 * Creates a mock AST node for testing AST transformations
 */
export function createTestAST(code: string) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript'],
  });

  if (!ast) {
    throw new Error('Failed to parse code');
  }

  return ast;
}
