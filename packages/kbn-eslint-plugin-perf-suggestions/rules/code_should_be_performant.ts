/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as EsLint from 'eslint';
import type * as EsTree from 'estree';

const messages = {
  awaitInLoop:
    'Avoid using await inside loops. Consider collecting promises and awaiting Promise.all for concurrency. (score=5)',
  arraySpreadConcat:
    'Using array spread in concatenation inside hot paths can be costly. Prefer push/apply or preallocate when possible. (score=3)',
  largeObjectSpread:
    'Object spread in tight loops can cause allocations. Consider mutating a preallocated object or moving spread out of the loop. (score=3)',
  mapForSideEffects:
    'Array.map is meant for transformations. For side effects use forEach; for performance-critical paths, consider a for loop. (score=1)',
  nPlusOneAwait:
    'Detected potential N+1 async pattern. Batch requests or use Promise.all to parallelize. (score=5)',
  regexInLoop:
    'RegExp creation or heavy parsing inside loops can be expensive. Hoist the RegExp or parsed value outside the loop. (score=3)',
  jsonParseInLoop:
    'JSON.parse/stringify inside tight loops can be costly. Hoist or avoid when possible. (score=4)',
  jsxInlineFunction:
    'Avoid inline functions in JSX props; define handlers with useCallback or as stable methods to prevent unnecessary re-renders. (score=2)',
  jsxInlineObject:
    'Avoid creating new object/array literals in JSX props; hoist or memoize to keep prop identity stable. (score=2)',
  arrayConcatInLoop:
    'Array.concat inside loops allocates new arrays. Prefer push or pre-sizing when possible. (score=4)',
  membershipLinearInLoop:
    'Linear membership checks (includes/indexOf) inside loops are O(n^2). Consider using a Set/Map for O(1) lookups. (score=5)',
  bindInLoop:
    'Function.bind inside loops allocates. Hoist bound functions or use stable arrow functions created once. (score=3)',
  tryCatchInLoop:
    'try/catch inside tight loops may impact performance. Move it outside the loop if possible. (score=2)',
  chainedArrayMethods:
    'Multiple array transformations chained (map/filter/reduce/flatMap). Consider a single-pass loop for performance-critical paths. (score=3)',
} as const;

export const CodeShouldBePerformant: EsLint.Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggests avoiding common performance pitfalls in JS/TS code.',
      recommended: false,
    },
    schema: [],
    messages,
  },
  create({ sourceCode, report }) {
    function isLoop(node: EsTree.Node): boolean {
      return (
        node.type === 'ForStatement' ||
        node.type === 'ForInStatement' ||
        node.type === 'ForOfStatement' ||
        node.type === 'WhileStatement' ||
        node.type === 'DoWhileStatement'
      );
    }

    function isInsideLoopFor(node: EsTree.Node): boolean {
      const ancestors = sourceCode.getAncestors(node) as EsTree.Node[];
      return ancestors.some(isLoop);
    }

    function isArrayMethod(name: string) {
      return (
        name === 'map' ||
        name === 'filter' ||
        name === 'reduce' ||
        name === 'flatMap' ||
        name === 'sort'
      );
    }

    return {
      // 1) Await inside loops
      AwaitExpression(node: EsTree.AwaitExpression) {
        if (isInsideLoopFor(node)) {
          report({ node, message: messages.awaitInLoop });
        }
      },

      // 2) Array spread concatenation patterns inside hot paths
      ArrayExpression(node: EsTree.ArrayExpression) {
        if (!node.elements) return;

        const hasSpread = node.elements.some((e) => e && e.type === 'SpreadElement');

        if (!hasSpread) return;

        if (isInsideLoopFor(node)) {
          report({ node, message: messages.arraySpreadConcat });
        }
      },

      // 3) Object spread in tight loops
      ObjectExpression(node: EsTree.ObjectExpression) {
        if (!node.properties) return;

        const hasSpread = node.properties.some((p) => p.type === 'SpreadElement');

        if (!hasSpread) return;

        if (isInsideLoopFor(node)) {
          report({ node, message: messages.largeObjectSpread });
        }
      },

      // 4) Using .map for side-effects & JSON.parse/stringify in loops
      CallExpression(node: EsTree.CallExpression) {
        // map for side effects
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'map'
        ) {
          const parent = (node as any).parent;

          if (parent && parent.type === 'ExpressionStatement') {
            report({ node, message: messages.mapForSideEffects });
          }
        }

        // JSON.parse/stringify in loops
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'JSON' &&
          node.callee.property.type === 'Identifier' &&
          (node.callee.property.name === 'parse' || node.callee.property.name === 'stringify')
        ) {
          if (isInsideLoopFor(node)) {
            report({ node, message: messages.jsonParseInLoop });
          }
        }

        // Array.concat in loops
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'concat'
        ) {
          if (isInsideLoopFor(node)) {
            report({ node, message: messages.arrayConcatInLoop });
          }
        }

        // Linear membership checks in loops: includes/indexOf
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier' &&
          (node.callee.property.name === 'includes' || node.callee.property.name === 'indexOf')
        ) {
          if (isInsideLoopFor(node)) {
            report({ node, message: messages.membershipLinearInLoop });
          }
        }

        // bind in loops
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'bind'
        ) {
          if (isInsideLoopFor(node)) {
            report({ node, message: messages.bindInLoop });
          }
        }

        // Chained array methods (anywhere)
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier' &&
          isArrayMethod(node.callee.property.name)
        ) {
          const obj = node.callee.object;

          if (
            obj &&
            obj.type === 'CallExpression' &&
            obj.callee.type === 'MemberExpression' &&
            !obj.callee.computed &&
            obj.callee.property.type === 'Identifier' &&
            isArrayMethod(obj.callee.property.name)
          ) {
            report({ node, message: messages.chainedArrayMethods });
          }
        }
      },

      // 5) RegExp construction or heavy parsing inside loops
      NewExpression(node: EsTree.NewExpression) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'RegExp') {
          if (isInsideLoopFor(node)) {
            report({ node, message: messages.regexInLoop });
          }
        }
      },

      // RegExp literal inside loops
      Literal(node: any) {
        if (node && node.regex) {
          if (isInsideLoopFor(node)) {
            report({ node, message: messages.regexInLoop });
          }
        }
      },

      // 6) React/JSX-specific perf smells
      JSXAttribute(node: any) {
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;

        const expr = node.value.expression as EsTree.Expression;

        if (!expr) return;

        // Inline functions in props: e.g. onClick={() => ...}
        if (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') {
          report({ node: node as any, message: messages.jsxInlineFunction });
          return;
        }

        // New object/array literals in props: e.g. style={{...}} or items={[...]}
        if (expr.type === 'ObjectExpression' || expr.type === 'ArrayExpression') {
          report({ node, message: messages.jsxInlineObject });
          return;
        }
      },

      // 7) Try/catch inside loops
      TryStatement(node: EsTree.TryStatement) {
        if (isInsideLoopFor(node)) {
          report({ node, message: messages.tryCatchInLoop });
        }
      },
    } as EsLint.Rule.RuleListener;
  },
};
