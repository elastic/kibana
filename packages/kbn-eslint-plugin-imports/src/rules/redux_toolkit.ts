/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Context, CreateOnceRule, ESTree, VisitorWithHooks } from '@oxlint/plugins';

type Node = ESTree.Node;
type CallExpression = ESTree.CallExpression;
type FunctionExpression = Extract<ESTree.Node, { type: 'FunctionExpression' }>;
type ArrowFunctionExpression = ESTree.ArrowFunctionExpression;

type Callback = FunctionExpression | ArrowFunctionExpression;

const isCallback = (node: Node): node is Callback =>
  node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';

const createListener = (
  context: Context,
  check: (node: CallExpression, apiName: string) => void
): VisitorWithHooks => {
  const imports = new Map<string, string>();
  const namespaces = new Set<string>();
  return {
    before() {
      imports.clear();
      namespaces.clear();
    },
    ImportDeclaration(node) {
      if (!['@reduxjs/toolkit', 'redux-toolkit-v1'].includes(String(node.source.value))) return;
      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportSpecifier') {
          imports.set(
            specifier.local.name,
            specifier.imported.type === 'Identifier'
              ? specifier.imported.name
              : String(specifier.imported.value)
          );
        } else if (specifier.type === 'ImportNamespaceSpecifier') {
          namespaces.add(specifier.local.name);
        }
      }
    },
    CallExpression(node) {
      const { callee } = node;
      let name: string | undefined;
      let local: string | undefined;
      if (callee.type === 'Identifier') {
        name = imports.get(callee.name);
        local = callee.name;
      } else if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.object.type === 'Identifier' &&
        callee.property.type === 'Identifier' &&
        namespaces.has(callee.object.name)
      ) {
        name = callee.property.name;
        local = callee.object.name;
      }
      if (!name || !local) return;
      // Ignore shadowed imports rather than diagnosing unrelated functions.
      let scope = context.sourceCode.getScope(node);
      while (scope) {
        const variable = scope.set.get(local);
        if (variable) {
          if (!variable.defs.some((definition) => definition.type === 'ImportBinding')) return;
          break;
        }
        if (!scope.upper) break;
        scope = scope.upper;
      }
      if (
        name === 'configureStore' ||
        name === 'createSlice' ||
        name === 'createReducer' ||
        name === 'getDefaultMiddleware'
      ) {
        check(node, name);
      }
    },
  };
};

const hasSameBinding = (
  context: Context,
  callback: Callback,
  node: Node,
  name: string
): boolean => {
  const { sourceCode } = context;
  const parameter = sourceCode.getScope(callback).set.get(name);
  let scope = sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(name);
    if (variable) return variable === parameter;
    if (!scope.upper) break;
    scope = scope.upper;
  }
  return false;
};

const walk = (node: Node, context: Context, visit: (child: Node) => void): void => {
  visit(node);
  if (isCallback(node) || node.type === 'FunctionDeclaration') return;
  for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
    const value = Reflect.get(node, key);
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child.type === 'string') walk(child, context, visit);
      }
    } else if (value && typeof value.type === 'string') {
      walk(value, context, visit);
    }
  }
};

export const NoReduxToolkitMiddlewareSpreadRule: CreateOnceRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      spread:
        'Preserve middleware tuple typing: use getDefaultMiddleware().concat() or .prepend() instead of spreading it.',
    },
  },
  createOnce(context) {
    return createListener(context, (node, apiName) => {
      if (apiName === 'getDefaultMiddleware') {
        if (node.parent.type === 'SpreadElement') {
          context.report({ node: node.parent, messageId: 'spread' });
        }
        return;
      }
      if (apiName !== 'configureStore') return;
      const options = node.arguments[0];
      if (options?.type !== 'ObjectExpression') return;
      const middleware = options.properties.find(
        (property) =>
          property.type === 'Property' &&
          !property.computed &&
          property.key.type === 'Identifier' &&
          property.key.name === 'middleware'
      );
      if (middleware?.type !== 'Property' || !isCallback(middleware.value)) return;
      const callback = middleware.value;
      const parameter = callback.params[0];
      if (parameter?.type !== 'Identifier') return;
      walk(callback.body, context, (child) => {
        if (child.type !== 'SpreadElement' || child.argument.type !== 'CallExpression') return;
        const { callee } = child.argument;
        if (
          callee.type === 'Identifier' &&
          callee.name === parameter.name &&
          hasSameBinding(context, callback, child, parameter.name)
        ) {
          context.report({ node: child, messageId: 'spread' });
        }
      });
    });
  },
};

export const NoReduxToolkitStateReassignmentRule: CreateOnceRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      reassignment:
        'Reassigning the draft parameter alone does not replace Redux state. Mutate the draft directly or return replacement state.',
    },
  },
  createOnce(context) {
    const checkReducer = (callback: Callback) => {
      const parameter = callback.params[0];
      if (parameter?.type !== 'Identifier' || callback.body.type !== 'BlockStatement') return;
      const assignments: Node[] = [];
      let returnsValue = false;
      walk(callback.body, context, (child) => {
        // Any value return makes this inconclusive without control-flow analysis.
        if (child.type === 'ReturnStatement' && child.argument) returnsValue = true;
        if (
          child.type === 'ExpressionStatement' &&
          child.expression.type === 'AssignmentExpression' &&
          child.expression.operator === '=' &&
          child.expression.left.type === 'Identifier' &&
          child.expression.left.name === parameter.name &&
          hasSameBinding(context, callback, child, parameter.name)
        )
          assignments.push(child.expression);
      });
      if (!returnsValue) {
        for (const assignment of assignments)
          context.report({ node: assignment, messageId: 'reassignment' });
      }
    };
    return createListener(context, (node, apiName) => {
      if (apiName !== 'createSlice' && apiName !== 'createReducer') return;
      const options = node.arguments[0];
      if (options?.type === 'ObjectExpression') {
        for (const property of options.properties) {
          if (
            property.type !== 'Property' ||
            property.computed ||
            property.key.type !== 'Identifier'
          )
            continue;
          if (property.key.name === 'reducers' && property.value.type === 'ObjectExpression') {
            for (const reducer of property.value.properties) {
              if (reducer.type !== 'Property') continue;
              if (isCallback(reducer.value)) checkReducer(reducer.value);
              if (reducer.value.type === 'ObjectExpression') {
                for (const prepared of reducer.value.properties) {
                  if (
                    prepared.type === 'Property' &&
                    prepared.key.type === 'Identifier' &&
                    prepared.key.name === 'reducer' &&
                    isCallback(prepared.value)
                  )
                    checkReducer(prepared.value);
                }
              }
            }
          }
        }
      }
      // Builder callbacks occur in createReducer's second argument and extraReducers.
      const builders: Callback[] = [];
      const second = node.arguments[1];
      if (second && isCallback(second)) builders.push(second);
      if (options?.type === 'ObjectExpression') {
        for (const property of options.properties) {
          if (
            property.type === 'Property' &&
            property.key.type === 'Identifier' &&
            property.key.name === 'extraReducers' &&
            isCallback(property.value)
          )
            builders.push(property.value);
        }
      }
      for (const builder of builders) {
        const parameter = builder.params[0];
        if (parameter?.type !== 'Identifier') continue;
        walk(builder.body, context, (child) => {
          if (child.type !== 'CallExpression' || child.callee.type !== 'MemberExpression') return;
          const member = child.callee;
          if (
            member.computed ||
            member.property.type !== 'Identifier' ||
            !['addCase', 'addMatcher', 'addDefaultCase'].includes(member.property.name)
          )
            return;
          let receiver = member.object;
          while (
            receiver.type === 'CallExpression' &&
            receiver.callee.type === 'MemberExpression'
          ) {
            receiver = receiver.callee.object;
          }
          if (
            receiver.type !== 'Identifier' ||
            receiver.name !== parameter.name ||
            !hasSameBinding(context, builder, child, parameter.name)
          )
            return;
          const reducer = child.arguments[member.property.name === 'addDefaultCase' ? 0 : 1];
          if (reducer && isCallback(reducer)) checkReducer(reducer);
        });
      }
    });
  },
};
