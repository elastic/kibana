/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { VisitNodeFunction } from '@babel/traverse';
import { PluginState, VisitorContext } from './types';
import { RequireExpression } from '../../traverse/types';

/**
 * Rewrites require('./foo') calls when edge rewrites are available.
 * For plain require() calls, follows default exports and rewrites if deepest export is not in imported file.
 * Example: require('./module') -> require('./rewritten-module')
 */
export function createRequireExpressionVisitor<S extends PluginState>(
  visitorContext: VisitorContext
): VisitNodeFunction<S, RequireExpression> {
  return function (callPath) {
    const node = callPath.node;

    // RequireExpression has arguments[0] as the module specifier
    if (!node.arguments[0] || typeof node.arguments[0].value !== 'string') {
      return;
    }

    const specifier = node.arguments[0].value;

    // For plain require() calls, we use 'default' as the itemName (represents whole module import)
    visitorContext.withEdgeRewrite('default', specifier, (rewrite) => {
      node.arguments[0].value = rewrite.filePath;
    });
  };
}
