/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Rule } from 'eslint';

// This excludes `addError` on purpose as it has a different API
const TOAST_METHODS = new Set(['addSuccess', 'addWarning', 'addInfo', 'addDanger']);

// Method names that are too generic and could be shared with non-toast APIs.
// They require the receiver to look like the toast service before flagging.
const SCOPED_TOAST_METHODS = new Set(['add']);

// Supported utils used in Toast API `text` to render JSX
const MOUNT_FUNCTIONS = new Set(['mountReactNode', 'toMountPoint']);

// Interactive elements that should be passed via `actionProps` and not as text content
const ACTION_ELEMENTS = new Set([
  'EuiButton',
  'EuiButtonEmpty',
  'EuiButtonIcon',
  'button',
  'EuiLink',
]);

// Layout/container elements that are treated as transparent and traversed into.
const CONTAINER_ELEMENTS = new Set([
  'div',
  'Fragment',
  'EuiFlexGroup',
  'EuiFlexItem',
  'EuiFlexGrid',
]);

const getPropertyKeyName = (
  key: TSESTree.Expression | TSESTree.PrivateIdentifier
): string | undefined => {
  if (key.type === 'Identifier') {
    return key.name;
  }

  if (key.type === 'Literal' && typeof key.value === 'string') {
    return key.value;
  }

  return undefined;
};

const getJSXElementName = (name: TSESTree.JSXTagNameExpression): string | null => {
  if (name.type === 'JSXIdentifier') {
    return name.name;
  }

  if (name.type === 'JSXMemberExpression') {
    const { object, property } = name;
    if (
      object.type === 'JSXIdentifier' &&
      object.name === 'React' &&
      property.name === 'Fragment'
    ) {
      return 'Fragment';
    }

    return null;
  }

  return null;
};

interface ElementFinding {
  node: TSESTree.JSXElement;
  elementName: string;
}

interface ContentFindings {
  actionElements: ElementFinding[];
}

/**
 * Util to traverse the JSX content of a mount function argument and collect action elements.
 */
const collectMountContent = (rootNode: TSESTree.Node): ContentFindings => {
  const findings: ContentFindings = {
    actionElements: [],
  };

  const traverse = (node: TSESTree.Node): void => {
    switch (node.type) {
      case 'JSXElement': {
        const elementName = getJSXElementName(node.openingElement.name);

        if (elementName !== null && ACTION_ELEMENTS.has(elementName)) {
          findings.actionElements.push({ node, elementName });
        } else if (elementName !== null && CONTAINER_ELEMENTS.has(elementName)) {
          for (const child of node.children) traverse(child);
        }
        // Unknown custom component or unresolvable member expression — stop traversal.

        break;
      }

      case 'JSXFragment': {
        for (const child of node.children) traverse(child);

        break;
      }

      case 'JSXExpressionContainer': {
        if (node.expression.type !== 'JSXEmptyExpression') {
          traverse(node.expression);
        }

        break;
      }

      case 'LogicalExpression': {
        traverse(node.right);

        break;
      }

      case 'ConditionalExpression': {
        traverse(node.consequent);
        traverse(node.alternate);

        break;
      }

      default:
        break;
    }
  };

  traverse(rootNode);
  return findings;
};

/**
 * Returns true if the receiver of a call looks like the toast service:
 *   toasts.add()
 *   notifications.toasts.add()
 */
const isToastsReceiver = (obj: TSESTree.Node): boolean => {
  if (obj.type === 'Identifier') return obj.name === 'toasts';
  if (obj.type === 'MemberExpression' && obj.property.type === 'Identifier') {
    return obj.property.name === 'toasts';
  }
  return false;
};

interface ToastMountArg {
  methodName: string;
  mountFn: string;
  mountArg: TSESTree.Node;
}

/**
 * Util that locates all `text: mountFn()` patterns inside a toast method call and invokes
 * the callback for each one.
 */
const forEachToastMountArg = (
  node: Rule.Node,
  callback: (ctx: ToastMountArg) => void
): void => {
  const callNode = node as unknown as TSESTree.CallExpression;

  if (
    callNode.callee.type !== 'MemberExpression' ||
    callNode.callee.property.type !== 'Identifier' ||
    (!TOAST_METHODS.has(callNode.callee.property.name) &&
      !SCOPED_TOAST_METHODS.has(callNode.callee.property.name))
  ) {
    return;
  }

  const methodName = callNode.callee.property.name;

  if (SCOPED_TOAST_METHODS.has(methodName) && !isToastsReceiver(callNode.callee.object)) {
    return;
  }

  for (const arg of callNode.arguments) {
    if (arg.type !== 'ObjectExpression') continue;

    const textProperty = arg.properties.find(
      (prop): prop is TSESTree.Property =>
        prop.type === 'Property' && !prop.computed && getPropertyKeyName(prop.key) === 'text'
    );

    if (!textProperty) continue;

    const value = textProperty.value;

    if (
      value.type !== 'CallExpression' ||
      value.callee.type !== 'Identifier' ||
      !MOUNT_FUNCTIONS.has(value.callee.name)
    ) {
      continue;
    }

    const mountFn = value.callee.name;
    const mountArg = value.arguments[0];

    if (!mountArg || mountArg.type === 'SpreadElement') continue;

    callback({ methodName, mountFn, mountArg });
  }
};

// main rule
export const PreferToastActionProps: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer `actionProps` over passing actions as part of the text in toast service calls.',
      category: 'Migration',
      recommended: true,
    },
    messages: {
      actionElementInMountContent:
        'Pass `actionProps` to `{{method}}()` instead of embedding <{{elementName}}> inside `{{mountFn}}()`.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node: Rule.Node) {
        forEachToastMountArg(node, ({ methodName, mountFn, mountArg }) => {
          const { actionElements } = collectMountContent(mountArg);

          for (const { node: actionNode, elementName } of actionElements) {
            context.report({
              node: actionNode as unknown as Rule.Node,
              messageId: 'actionElementInMountContent',
              data: { elementName, method: methodName, mountFn },
            });
          }
        });
      },
    };
  },
};
