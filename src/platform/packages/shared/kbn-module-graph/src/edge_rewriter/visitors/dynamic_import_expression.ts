/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { VisitNodeFunction } from '@babel/traverse';
import { VisitorContext } from './types';
import { DynamicImportExpression } from '../../traverse/types';

/**
 * Handles dynamic import expressions like: import('./module')
 * Similar to regular require() calls but uses ES6 dynamic import syntax.
 * Example: import('./module') -> import('./rewritten-module')
 */
export function createDynamicImportExpressionVisitor<S>(
  visitorContext: VisitorContext
): VisitNodeFunction<S, DynamicImportExpression> {
  return function (callPath) {
    const node = callPath.node;

    // DynamicImportExpression has arguments[0] as the module specifier
    if (!node.arguments[0] || typeof node.arguments[0].value !== 'string') {
      return;
    }

    const specifier = node.arguments[0].value;

    // For dynamic import() calls, we use 'default' as the itemName (represents whole module import)
    visitorContext.withEdgeRewrite('default', specifier, (rewrite) => {
      node.arguments[0].value = rewrite.filePath;
    });
  };
}
