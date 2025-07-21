/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Path from 'path';
import traverse, { VisitNodeFunction } from '@babel/traverse';
import { Node } from '@babel/core';
import { cloneDeepWithoutLoc } from '@babel/types';
import { getDependencyTraverseOptions } from '../traverse/get_dependency_traverse_options';
import { EdgeRewriteResult, RewriteStats } from './types';
import { EdgeRewriterTransformOptions } from './types';
import { createDynamicImportDeclarationVisitor } from './visitors/dynamic_import_declaration';
import { createDynamicImportExpressionVisitor } from './visitors/dynamic_import_expression';
import {
  createExportAllDeclarationVisitor,
  createExportDefaultDeclarationVisitor,
  createExportNamedDeclarationVisitor,
} from './visitors/export';
import { createImportDeclarationVisitor } from './visitors/import';
import { createRequireDeclarationVisitor } from './visitors/require_declaration';
import { createRequireExpressionVisitor } from './visitors/require_expression';
import { VisitorContext } from './visitors/types';

export function rewriteImportsAndExports(
  filePath: string,
  options: EdgeRewriterTransformOptions
): EdgeRewriteResult | null {
  const stats: RewriteStats = {
    rewrites: [],
  };

  const fileParseResult = options.getFileParseResult(filePath);

  if (!fileParseResult) {
    return null;
  }

  function wrapVisitorFactory<T extends Node, U extends VisitNodeFunction<{}, T>>(
    factory: (context: VisitorContext) => U
  ): VisitNodeFunction<{}, T> {
    return function visit(path, state) {
      const dir = Path.dirname(filePath);

      return factory({
        withEdgeRewrite: (itemName, specifier, cb) => {
          const absoluteSpecifierFilePath = options.resolve(specifier, { paths: [dir] });

          if (!absoluteSpecifierFilePath) {
            return;
          }

          const edgeResolverResult = options.getEdgeResolverResult(absoluteSpecifierFilePath);
          if (!edgeResolverResult) {
            return;
          }

          const source = edgeResolverResult.sources.get(itemName);

          if (source && source.filePath !== absoluteSpecifierFilePath) {
            const targetPath = source.filePath;

            let rel = Path.normalize(Path.relative(dir, targetPath));

            if (!rel.startsWith('./')) {
              rel = './' + rel;
            }

            cb({
              filePath: rel,
              itemName: source.name,
            });

            stats.rewrites.push({
              filePath,
              original: {
                filePath: absoluteSpecifierFilePath,
                itemName,
              },
              target: {
                filePath: targetPath,
                itemName: source.name,
              },
            });
          }
        },
      }).bind(this)(path, state);
    };
  }

  const visitorOptions = {
    ...getDependencyTraverseOptions<{}>({
      RequireExpression: wrapVisitorFactory(createRequireExpressionVisitor),
      RequireDeclaration: wrapVisitorFactory(createRequireDeclarationVisitor),
      DynamicImportExpression: wrapVisitorFactory(createDynamicImportExpressionVisitor),
      DynamicImportDeclaration: wrapVisitorFactory(createDynamicImportDeclarationVisitor),
      CommonJSExport() {},
      ExportAllDeclaration: wrapVisitorFactory(createExportAllDeclarationVisitor),
      ExportDefaultDeclaration: wrapVisitorFactory(createExportDefaultDeclarationVisitor),
      ExportNamedDeclaration: wrapVisitorFactory(createExportNamedDeclarationVisitor),
      ImportDeclaration: wrapVisitorFactory(createImportDeclarationVisitor),
      Jest() {},
    }),
  };

  const cloned = cloneDeepWithoutLoc(fileParseResult.parsed.ast);

  traverse(cloned, visitorOptions);

  return {
    path: filePath,
    rewrites: stats.rewrites,
    output: cloned,
  };
}
