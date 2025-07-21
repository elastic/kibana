/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { VisitNodeFunction } from '@babel/traverse';
import * as t from '@babel/types';
import { VisitorContext } from './types';
import { RequireDeclaration } from '../../traverse/types';

/**
 * Handles destructured require statements like: const { foo, bar } = require('./module');
 * Similar to ES6 import destructuring but uses CommonJS require syntax.
 * Example: const { foo, bar } = require('./module') -> individual rewrites per property
 */
export function createRequireDeclarationVisitor<S>(
  visitorContext: VisitorContext
): VisitNodeFunction<S, RequireDeclaration> {
  return function (callPath) {
    const node = callPath.node;

    const newVariableStatements: t.VariableDeclaration[] = [];

    // Iterate over each variable declarator
    node.declarations.forEach((declarator) => {
      if (
        declarator.init &&
        declarator.init.arguments[0] &&
        typeof declarator.init.arguments[0].value === 'string' &&
        declarator.id.type === 'ObjectPattern'
      ) {
        const specifier = declarator.init.arguments[0].value;
        const props = declarator.id.properties;

        // If only one property, just apply possible rewrite and keep as-is
        if (props.length === 1) {
          const prop = props[0];
          if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
            const itemName = prop.key.name;
            visitorContext.withEdgeRewrite(itemName, specifier, (rewrite) => {
              declarator.init.arguments[0].value = rewrite.filePath;
              if (rewrite.itemName && rewrite.itemName !== itemName && t.isIdentifier(prop.key)) {
                prop.key = t.identifier(rewrite.itemName);
              }
            });
          }
          return;
        }

        // Otherwise split into multiple require statements
        props.forEach((prop) => {
          if (prop.type !== 'ObjectProperty' || prop.key.type !== 'Identifier') {
            return;
          }

          const itemName = prop.key.name;

          // Clone the property node because it will be reused
          const clonedProp = t.cloneNode(prop, /* deep */ true);

          const objectPattern = t.objectPattern([clonedProp]);

          const requireCall = t.callExpression(t.identifier('require'), [
            t.stringLiteral(specifier),
          ]);

          // Apply rewrite if available
          visitorContext.withEdgeRewrite(itemName, specifier, (rewrite) => {
            (requireCall.arguments[0] as t.StringLiteral).value = rewrite.filePath;
            if (
              rewrite.itemName &&
              rewrite.itemName !== itemName &&
              t.isIdentifier(clonedProp.key)
            ) {
              clonedProp.key = t.identifier(rewrite.itemName);
            }
          });

          const varDeclarator = t.variableDeclarator(objectPattern, requireCall);
          const varDeclaration = t.variableDeclaration(node.kind, [varDeclarator]);

          newVariableStatements.push(varDeclaration);
        });
      }
    });

    if (newVariableStatements.length > 0) {
      const next = callPath.replaceWithMultiple(newVariableStatements);
      next.forEach((p) => p.skip());
    }
  };
}
