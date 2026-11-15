/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Oxlint's rule context implements ESLint 9's API. Plugins written for ESLint 8 still call the
// context methods ESLint 9 removed (`context.getScope()`, `context.getAncestors()`,
// `context.getSource()`, the forwarded `SourceCode` methods) and read `parserServices`, so these
// wrappers add them back on top of Oxlint's context.

// `@typescript-eslint/parser` without `parserOptions.project`, as ESLint runs it here: no
// `ts.Program`, so rules that only use type information when it is configured skip it.
const PARSER_SERVICES = Object.freeze({
  program: null,
  esTreeNodeToTSNodeMap: new WeakMap(),
  tsNodeToESTreeNodeMap: new WeakMap(),
});

const wrapRule = (rule) => {
  // ESLint 8 still accepted rules written as a bare `create` function.
  const { create, ...rest } = typeof rule === 'function' ? { create: rule } : rule;
  return {
    ...rest,
    create(context) {
      const { sourceCode } = context;
      // ESLint 8's `getScope()`/`getAncestors()` answer for the node being visited.
      let currentNode = null;
      const legacySourceCode = Object.create(sourceCode, {
        parserServices: { value: PARSER_SERVICES },
      });
      const legacyMethods = Object.create(context, {
        sourceCode: { value: legacySourceCode },
        parserServices: { value: PARSER_SERVICES },
        getSourceCode: { value: () => legacySourceCode },
        getSource: { value: (...args) => sourceCode.getText(...args) },
        getAncestors: { value: () => sourceCode.getAncestors(currentNode) },
        getScope: { value: () => sourceCode.getScope(currentNode) },
        markVariableAsUsed: {
          value: (name) => sourceCode.markVariableAsUsed(name, currentNode),
        },
      });
      const legacyContext = new Proxy(legacyMethods, {
        get(target, key) {
          if (key in target) {
            return Reflect.get(target, key);
          }
          // ESLint 8 forwarded these `SourceCode` methods from the context (`getFirstTokens`, ...).
          const value = sourceCode[key];
          return typeof value === 'function' ? value.bind(sourceCode) : value;
        },
      });

      const visitor = create(legacyContext);
      return Object.fromEntries(
        Object.entries(visitor).map(([selector, handler]) => [
          selector,
          // Code path handlers (`onCodePathStart`, `onUnreachableCodePathSegmentStart`, ...) receive
          // code paths and segments, not the visited node. Node selectors never start with `on`.
          typeof handler === 'function' && !selector.startsWith('on')
            ? (node, ...args) => {
                currentNode = node;
                return handler(node, ...args);
              }
            : handler,
        ])
      );
    },
  };
};

/** Wraps an ESLint 8 plugin's rules so they run in Oxlint as a JS plugin named `name`. */
const wrapEslint8Plugin = (name, plugin) => ({
  meta: { name },
  rules: Object.fromEntries(
    Object.entries(plugin.rules).map(([ruleName, rule]) => [ruleName, wrapRule(rule)])
  ),
});

module.exports = { wrapEslint8Plugin };
