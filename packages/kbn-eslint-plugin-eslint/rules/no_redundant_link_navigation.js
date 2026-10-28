/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

const NAVIGATE_FUNCTIONS = new Set(['navigateToUrl', 'navigateToApp']);

const isFunction = (node) =>
  node?.type === 'ArrowFunctionExpression' ||
  node?.type === 'FunctionExpression' ||
  node?.type === 'FunctionDeclaration';

const getCalleeName = (call) => {
  const callee = call?.callee;
  if (callee?.type === 'Identifier') return callee.name;
  if (callee?.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
};

/** Whether `predicate` matches `node` or a descendant, skipping nested functions. */
const someNode = (node, predicate, root = node) => {
  if (!node || typeof node.type !== 'string') return false;
  if (node !== root && isFunction(node)) return false;
  if (predicate(node)) return true;
  return Object.keys(node).some((key) => {
    if (key === 'parent') return false;
    const child = node[key];
    return Array.isArray(child)
      ? child.some((item) => someNode(item, predicate, root))
      : typeof child === 'object' && someNode(child, predicate, root);
  });
};

/** The call a statement makes directly: `foo();`, `void foo();` or `return foo();`. */
const getStatementCall = (statement) => {
  let expression;
  if (statement.type === 'ExpressionStatement') expression = statement.expression;
  if (statement.type === 'ReturnStatement') expression = statement.argument;
  if (expression?.type === 'UnaryExpression' && expression.operator === 'void') {
    expression = expression.argument;
  }
  if (expression?.type === 'ChainExpression') expression = expression.expression;
  return expression?.type === 'CallExpression' ? expression : undefined;
};

const isExit = ({ type }) => type === 'ReturnStatement' || type === 'ThrowStatement';

// Navigation options that a plain link click cannot reproduce.
const LINK_INEXPRESSIBLE_OPTIONS = new Set(['replace', 'state', 'openInNewTab', 'skipAppLeave']);

const hasOnlyLinkExpressibleOptions = ({ arguments: [, options] }) =>
  !options ||
  (options.type === 'ObjectExpression' &&
    options.properties.every(
      (prop) =>
        prop.type === 'Property' &&
        !prop.computed &&
        !LINK_INEXPRESSIBLE_OPTIONS.has(prop.key.name ?? prop.key.value)
    ));

/**
 * Returns the navigate function `fn` calls redundantly, if any: a `preventDefault()` statement
 * followed in the same block by a navigate statement, with no early exit between them. Anything
 * looser (different branches, nested callbacks) can prevent a click without navigating.
 */
const findRedundantNavigation = (fn) => {
  if (fn.body.type !== 'BlockStatement') return;
  const bails = someNode(
    fn.body,
    (node) =>
      node.type === 'AwaitExpression' ||
      (node.type === 'CallExpression' && getCalleeName(node) === 'stopPropagation')
  );
  if (bails) return;

  let navigateName;
  someNode(fn.body, (node) => {
    if (node.type !== 'BlockStatement') return false;
    let prevented = false;
    for (const statement of node.body) {
      const call = getStatementCall(statement);
      const name = getCalleeName(call);
      if (name === 'preventDefault') {
        prevented = true;
      } else if (prevented && NAVIGATE_FUNCTIONS.has(name)) {
        if (hasOnlyLinkExpressibleOptions(call)) navigateName = name;
        return true;
      } else if (prevented && someNode(statement, isExit)) {
        prevented = false;
      }
    }
    return false;
  });
  return navigateName;
};

const unwrapUseCallback = (node) =>
  node?.type === 'CallExpression' && getCalleeName(node) === 'useCallback'
    ? node.arguments[0]
    : node;

const isRoutableHref = (node) => {
  if (!node) return false;
  if (node.type === 'Identifier') return node.name !== 'undefined';
  if (node.type !== 'Literal') return true;
  return typeof node.value === 'string' && node.value !== '' && !node.value.startsWith('#');
};

const isExternalRel = (node) =>
  node?.type === 'Literal' && typeof node.value === 'string' && /\bexternal\b/i.test(node.value);

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow onClick handlers that duplicate the core link routing for elements with an href.',
    },
    schema: [],
    messages: {
      redundantNavigation:
        'Remove preventDefault() and {{name}}() from this onClick: core (@kbn/global-redirect-app-links) already routes same-origin <a href> clicks through navigateToUrl, and handling it here duplicates that logic and often breaks Cmd/Ctrl-click. Keep other side effects (telemetry, closing a popover). Explicit navigation is only needed when the element has no href, navigation must await other work, or an ancestor stops click propagation before it reaches document.body.',
    },
  },
  createOnce(context) {
    let sourceCode;

    const resolveHandler = (node) => {
      const handler = unwrapUseCallback(node);
      if (handler?.type !== 'Identifier') return handler;

      for (let scope = sourceCode.getScope(handler); scope; scope = scope.upper) {
        const variable = scope.variables.find(({ name }) => name === handler.name);
        if (!variable) continue;
        const def = variable.defs[0];
        if (def?.type === 'FunctionName') return def.node;
        if (def?.type === 'Variable') return unwrapUseCallback(def.node.init);
        return;
      }
    };

    const check = (reportNode, { href, target, ignored }, onClickValue) => {
      // Core does not route these links (see click_handler.ts), so an explicit handler is not redundant.
      if (!isRoutableHref(href) || ignored) return;
      if (target && !(target.type === 'Literal' && target.value === '_self')) return;
      const handler = resolveHandler(onClickValue);
      if (!isFunction(handler)) return;

      const navigateName = findRedundantNavigation(handler);
      if (!navigateName) return;

      context.report({
        node: reportNode,
        messageId: 'redundantNavigation',
        data: { name: navigateName },
      });
    };

    const findAttribute = (attributes, name) =>
      attributes.find((attr) => attr.type === 'JSXAttribute' && attr.name.name === name);

    const getAttributeValue = (attributes, name) => {
      const value = findAttribute(attributes, name)?.value;
      return value?.type === 'JSXExpressionContainer' ? value.expression : value;
    };

    const getPropertyValue = (properties, name) =>
      properties.find(
        (prop) =>
          prop.type === 'Property' &&
          !prop.computed &&
          (prop.key.name === name || prop.key.value === name)
      )?.value;

    return {
      before() {
        sourceCode = context.sourceCode;
      },
      JSXOpeningElement(node) {
        const { attributes } = node;
        const onClick = getAttributeValue(attributes, 'onClick');
        if (!onClick) return;
        check(
          node,
          {
            href: getAttributeValue(attributes, 'href'),
            target: getAttributeValue(attributes, 'target'),
            ignored:
              Boolean(findAttribute(attributes, 'data-kbn-redirect-app-link-ignore')) ||
              Boolean(findAttribute(attributes, 'download')) ||
              isExternalRel(getAttributeValue(attributes, 'rel')),
          },
          onClick
        );
      },
      ObjectExpression(node) {
        const { properties } = node;
        const onClick = getPropertyValue(properties, 'onClick');
        if (!onClick) return;
        check(
          node,
          {
            href: getPropertyValue(properties, 'href'),
            target: getPropertyValue(properties, 'target'),
            ignored:
              Boolean(getPropertyValue(properties, 'data-kbn-redirect-app-link-ignore')) ||
              Boolean(getPropertyValue(properties, 'download')) ||
              isExternalRel(getPropertyValue(properties, 'rel')),
          },
          onClick
        );
      },
    };
  },
};
