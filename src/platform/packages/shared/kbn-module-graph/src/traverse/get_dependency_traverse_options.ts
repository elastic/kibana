/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NodePath, TraverseOptions, VisitNode, VisitNodeObject } from '@babel/traverse';
import * as t from '@babel/types';
import { mapValues, noop } from 'lodash';
import type {
  CommonJSExportAssignmentExpression,
  DependencyTraverseOptions,
  DependencyTraverseOptionsAsFunctions,
  DependencyTraverseOptionsAsObjects,
  DynamicImportDeclaration,
  DynamicImportExpression,
  JestMockExpression,
  RequireDeclaration,
  RequireExpression,
} from './types';
import { isImportUsedAsValue } from './is_import_used_as_value';

const JEST_METHODS = [
  'mock',
  'doMock',
  'unmock',
  'deepUnmock',
  // requireActual should be left as-is
  // 'requireActual',
  'requireMock',
  'setMock',
  'genMockFromModule',
  'dontMock',
];

function asFunction<S>(
  options: DependencyTraverseOptions<S>,
  cb: (normalizedOptions: DependencyTraverseOptionsAsFunctions<S>) => TraverseOptions<S>
): TraverseOptions<S>;

function asFunction<S>(
  options: DependencyTraverseOptions<S>,
  cb: (normalized: DependencyTraverseOptionsAsFunctions<S>) => TraverseOptions<S>
): TraverseOptions<S> {
  // Convert each VisitNode (function OR { enter/exit }) into a single function.

  const asObjects = mapValues(
    options,
    (handler: VisitNode<S, t.Node>): VisitNodeObject<S, t.Node> => {
      if (typeof handler === 'function') {
        return {
          enter: handler,
        };
      }

      return handler;
    }
  ) as unknown as DependencyTraverseOptionsAsObjects<S>;

  const enterHandlers = mapValues(asObjects, (handler) => handler.enter || noop);
  const exitHandlers = mapValues(asObjects, (handler) => handler.exit || noop);

  const enter = cb(enterHandlers);
  const exit = cb(exitHandlers);

  // Let the caller build the real TraverseOptions from the normalized map
  return mapValues<TraverseOptions<S>>(
    {
      ...enter,
      ...exit,
    },
    (value: VisitNodeObject<S, t.Node>, key: keyof (typeof enter | typeof exit)) => {
      return {
        enter: enter[key as keyof typeof enter],
        exit: exit[key as keyof typeof exit],
      };
    }
  );
}

export function getDependencyTraverseOptions<S>(
  options: DependencyTraverseOptions<S>
): TraverseOptions<S>;

export function getDependencyTraverseOptions(options: DependencyTraverseOptions): TraverseOptions {
  return asFunction(
    options,
    ({
      RequireDeclaration,
      DynamicImportDeclaration,
      DynamicImportExpression,
      RequireExpression,
      ExportAllDeclaration,
      ExportDefaultDeclaration,
      ExportNamedDeclaration,
      ImportDeclaration,
      Jest,
      CommonJSExport,
    }) => ({
      ExportDefaultDeclaration,
      ExportNamedDeclaration(callPath, state) {
        const onlyTypes =
          callPath.node.exportKind === 'type' ||
          (callPath.node.specifiers.length > 0 &&
            callPath.node.specifiers.every(
              (spec) => t.isExportSpecifier(spec) && spec.exportKind === 'type'
            ));

        if (onlyTypes) {
          return;
        }

        ExportNamedDeclaration.call(this, callPath, state);
      },
      // `export type * from "./lib"`
      ExportAllDeclaration(callPath, state) {
        if (callPath.node.exportKind === 'type') {
          return;
        }

        ExportAllDeclaration.call(this, callPath, state);
      },
      ImportDeclaration(callPath, state) {
        const onlyTypes =
          callPath.node.importKind === 'type' ||
          (callPath.node.specifiers.length > 0 &&
            callPath.node.specifiers.every(
              (spec) => t.isImportSpecifier(spec) && spec.importKind === 'type'
            ));

        if (onlyTypes) {
          return;
        }

        // Skip if all referenced bindings are used only in type positions
        if (!isImportUsedAsValue(callPath)) {
          return;
        }

        ImportDeclaration.call(this, callPath, state);
      },
      CallExpression(callPath, state) {
        const callee = callPath.node.callee;

        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.object, { name: 'jest' }) &&
          t.isIdentifier(callee.property) &&
          JEST_METHODS.includes(callee.property.name)
        ) {
          Jest.call(this, callPath as unknown as NodePath<JestMockExpression>, state);
          return;
        }

        if (!t.isStringLiteral(callPath.node.arguments[0])) {
          return;
        }

        if (t.isIdentifier(callee, { name: 'require' })) {
          RequireExpression.call(this, callPath as unknown as NodePath<RequireExpression>, state);
          return;
        }

        if (t.isImport(callee)) {
          DynamicImportExpression.call(
            this,
            callPath as unknown as NodePath<DynamicImportExpression>,
            state
          );
        }
      },
      VariableDeclaration(declarationPath, state) {
        const { node } = declarationPath;

        for (const declarator of node.declarations) {
          const init = declarator.init;
          let callExpression: t.CallExpression | null = null;
          let isAwaited = false;

          // Check for direct CallExpression: const { foo } = import('./module')
          if (init && t.isCallExpression(init)) {
            callExpression = init;
            isAwaited = false;
          }
          // Check for AwaitExpression wrapping CallExpression: const { foo } = await import('./module')
          else if (init && t.isAwaitExpression(init) && t.isCallExpression(init.argument)) {
            callExpression = init.argument;
            isAwaited = true;
          }

          if (
            callExpression &&
            callExpression.arguments[0] &&
            t.isStringLiteral(callExpression.arguments[0])
          ) {
            const isRequire = t.isIdentifier(callExpression.callee, { name: 'require' });
            const isDynamicImport = t.isImport(callExpression.callee);

            // Only create named edges when the variable declaration uses object destructuring.
            if (!t.isObjectPattern(declarator.id) || declarator.id.properties.length === 0) {
              // The CallExpression visitor will already have handled the generic edge for
              // `const mod = require('foo');` or similar, so we intentionally skip here.
              continue;
            }

            const hasRestProperties = declarator.id.properties.find((property) => {
              return !t.isObjectProperty(property) || !t.isIdentifier(property.key);
            });

            if (hasRestProperties) {
              return;
            }

            if (isRequire) {
              RequireDeclaration.call(
                this,
                declarationPath as unknown as NodePath<RequireDeclaration>,
                state
              );
              declarationPath.skip();
              return;
            }

            if (isDynamicImport) {
              if (isAwaited) {
                // Awaited destructured dynamic import: const { foo } = await import('./module')
                DynamicImportDeclaration.call(
                  this,
                  declarationPath as unknown as NodePath<DynamicImportDeclaration>,
                  state
                );
                declarationPath.skip();
              }
              return;
            }
          }
        }
      },
      AssignmentExpression(assignPath, state) {
        const { node } = assignPath;

        if (t.isMemberExpression(node.left)) {
          // Handle exports.foo = bar
          if (t.isIdentifier(node.left.object) && node.left.object.name === 'exports') {
            CommonJSExport.call(
              this,
              assignPath as NodePath<CommonJSExportAssignmentExpression>,
              state
            );
            return;
          }

          // Handle module.exports = something
          if (
            t.isIdentifier(node.left.object) &&
            node.left.object.name === 'module' &&
            t.isIdentifier(node.left.property) &&
            node.left.property.name === 'exports'
          ) {
            CommonJSExport.call(
              this,
              assignPath as NodePath<CommonJSExportAssignmentExpression>,
              state
            );
            return;
          }

          // Handle module.exports.foo = bar
          if (
            t.isMemberExpression(node.left.object) &&
            t.isIdentifier(node.left.object.object) &&
            node.left.object.object.name === 'module' &&
            t.isIdentifier(node.left.object.property) &&
            node.left.object.property.name === 'exports'
          ) {
            CommonJSExport.call(
              this,
              assignPath as NodePath<CommonJSExportAssignmentExpression>,
              state
            );
            return;
          }
        }
      },
    })
  );
}
