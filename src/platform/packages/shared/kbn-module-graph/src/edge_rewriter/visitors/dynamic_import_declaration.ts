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
import { DynamicImportDeclaration, RequireLikeCallExpression } from '../../traverse/types';

/**
 * Handles destructured dynamic import statements like: const { foo, bar } = await import('./module');
 * Similar to destructured require statements but uses ES6 dynamic import syntax.
 * Example: const { foo, bar } = await import('./module') -> individual rewrites per property
 */
export function createDynamicImportDeclarationVisitor<S>(
  visitorContext: VisitorContext
): VisitNodeFunction<S, DynamicImportDeclaration> {
  return function (callPath) {
    const node = callPath.node;

    // Process each variable declarator
    for (const declarator of node.declarations) {
      // Extract the actual call expression and determine if it's awaited
      let callExpression: RequireLikeCallExpression<t.Import> | null = null;
      let isAwaited = false;

      if (t.isCallExpression(declarator.init)) {
        callExpression = declarator.init;
        isAwaited = false;
      } else {
        callExpression = declarator.init.argument;
        isAwaited = true;
      }

      const originalSpecifier = callExpression.arguments[0].value;
      const properties = declarator.id.properties;

      // Multi-specifier case - need Promise.all() pattern
      const rewriteMap = new Map<string, string>();
      const importCalls: t.CallExpression[] = [];
      const arrayPatterns: t.ObjectPattern[] = [];

      // Collect all rewrites
      properties.forEach((prop) => {
        const itemName = prop.key.name;
        visitorContext.withEdgeRewrite(itemName, originalSpecifier, (rewrite) => {
          rewriteMap.set(itemName, rewrite.filePath);
          if (rewrite.itemName && rewrite.itemName !== itemName) {
            rewriteMap.set(itemName + '__rename', rewrite.itemName);
          }
        });
      });

      // Create individual object patterns and import calls for each property
      properties.forEach((prop) => {
        const itemName = prop.key.name;
        const targetPath = rewriteMap.get(itemName) || originalSpecifier;

        // Create object pattern for just this property
        let propToUse = prop as t.ObjectProperty;
        const renameKey = rewriteMap.get(itemName + '__rename');
        if (renameKey && t.isIdentifier(prop.key)) {
          // clone and rename key so we don't mutate original AST prop reused elsewhere
          propToUse = t.objectProperty(
            t.identifier(renameKey),
            prop.value,
            false,
            renameKey === (prop.value as t.Identifier).name
          );
        }

        const objectPattern = t.objectPattern([propToUse]);
        arrayPatterns.push(objectPattern);

        // Create import call for this target
        const importCall = t.callExpression(t.import(), [t.stringLiteral(targetPath)]);
        importCalls.push(importCall);
      });

      // Decide whether to wrap in Promise.all()
      let initExpr: t.Expression;
      let pattern: t.Pattern;

      if (importCalls.length === 1) {
        // Single import – keep simpler syntax
        initExpr = isAwaited ? t.awaitExpression(importCalls[0]) : importCalls[0];
        pattern = arrayPatterns[0]; // single ObjectPattern
      } else {
        const promiseAll = t.callExpression(
          t.memberExpression(t.identifier('Promise'), t.identifier('all')),
          [t.arrayExpression(importCalls)]
        );
        initExpr = isAwaited ? t.awaitExpression(promiseAll) : promiseAll;
        pattern = t.arrayPattern(arrayPatterns); // [{ foo }, { bar }]
      }

      const newDeclarator = t.variableDeclarator(pattern, initExpr);
      const newStatement = t.variableDeclaration('const', [newDeclarator]);

      callPath.replaceWith(newStatement);
    }
  };
}
