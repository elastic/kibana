/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type * as ESTree from 'estree';
import type { Rule, Scope } from 'eslint';

// This excludes `addError` on purpose as it has a different API
const TOAST_METHODS = new Set(['addSuccess', 'addWarning', 'addInfo', 'addDanger', 'add']);

// Supported utils used in Toast API `text` to render JSX
const MOUNT_FUNCTIONS = new Set(['mountReactNode', 'toMountPoint']);

// Interactive elements that should be passed via `actionProps` and not as text content.
const ACTION_ELEMENTS = new Set([
  'EuiButton',
  'EuiButtonEmpty',
  'EuiButtonIcon',
  'button',
  'EuiLink',
]);

// Layout/container elements that are treated as transparent and traversed into
const CONTAINER_ELEMENTS = new Set([
  'div',
  'p',
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

const isFormattedMessageElement = (node: TSESTree.Node): boolean =>
  node.type === 'JSXElement' && getJSXElementName(node.openingElement.name) === 'FormattedMessage';

// An action element is considered inline when it has a sibling JSXText or FormattedMessage.
// This is a heuristic to avoid flagging inline links that are part of a sentence.
const isInlineTextNode = (node: TSESTree.Node): boolean =>
  (node.type === 'JSXText' && node.value.trim() !== '') || isFormattedMessageElement(node);

interface ElementFinding {
  node: TSESTree.JSXElement;
  elementName: string;
}

interface ContentFindings {
  actionElements: ElementFinding[];
}

// A variable is only safely resolvable if it's assigned once. A second write
// reference means the value at the point of use can't be determined statically.
const isReassigned = (variable: Scope.Variable): boolean =>
  variable.references.filter((ref) => ref.isWrite()).length > 1;

/**
 * Resolves an identifier reference to its declared variable by walking the
 * scope chain, mirroring how the identifier itself would be resolved at runtime.
 * Returns null when unresolvable (e.g. globals) or unsafe to resolve statically
 * (reassigned after declaration).
 */
const resolveVariable = (
  context: Rule.RuleContext,
  node: TSESTree.Identifier
): Scope.Variable | null => {
  let scope: Scope.Scope | null = context.sourceCode.getScope(node as unknown as ESTree.Node);

  while (scope) {
    const reference = scope.references.find(
      (ref) => ref.identifier === (node as unknown as ESTree.Identifier)
    );

    if (reference) {
      const variable = reference.resolved;
      return variable && !isReassigned(variable) ? variable : null;
    }

    scope = scope.upper;
  }

  return null;
};

/**
 * Resolves an identifier to the expression it was initialized with, e.g. the
 * `<EuiButton/>` in `const actions = <EuiButton/>`.
 * Returns null for anything that can't be resolved (imports, params, reassignments).
 */
const resolveIdentifierValue = (
  context: Rule.RuleContext,
  node: TSESTree.Identifier
): TSESTree.Node | null => {
  const variable = resolveVariable(context, node);
  const def = variable?.defs[0];

  return def?.type === 'Variable' && def.node.init
    ? (def.node.init as unknown as TSESTree.Node)
    : null;
};

/**
 * Util to traverse the JSX content of a mount function argument and collect action elements
 */
const collectMountContent = (
  context: Rule.RuleContext,
  rootNode: TSESTree.Node
): ContentFindings => {
  const findings: ContentFindings = {
    actionElements: [],
  };
  const visited = new Set<TSESTree.Node>();

  // If an `EuiLink` has a sibling that's inline text (e.g. <FormattedMessage>) it reads as an
  // inline hyperlink as part of a sentence, not a standalone CTA, the same way an `EuiLink`
  // passed via <FormattedMessage>'s `values` is treated. Other action elements (e.g.
  // `EuiButton`) are always flagged regardless of this, since a button doesn't belong inline
  // in text the way a hyperlink might.
  const traverse = (node: TSESTree.Node, siblingOfInlineText = false): void => {
    if (visited.has(node)) return;
    visited.add(node);

    switch (node.type) {
      case 'JSXElement': {
        const elementName = getJSXElementName(node.openingElement.name);

        if (elementName === 'EuiLink' && siblingOfInlineText) {
          break;
        }

        if (elementName !== null && ACTION_ELEMENTS.has(elementName)) {
          findings.actionElements.push({ node, elementName });
        } else if (elementName !== null && CONTAINER_ELEMENTS.has(elementName)) {
          const hasInlineTextChild = node.children.some(isInlineTextNode);
          for (const child of node.children) traverse(child, hasInlineTextChild);
        }
        // Stop traversal. Content is either an i18n inline wrapper (e.g. FormattedMessage),
        // an unknown custom component, or an unresolvable member expression.
        break;
      }

      case 'JSXFragment': {
        const hasInlineTextChild = node.children.some(isInlineTextNode);
        for (const child of node.children) traverse(child, hasInlineTextChild);

        break;
      }

      case 'JSXExpressionContainer': {
        if (node.expression.type !== 'JSXEmptyExpression') {
          traverse(node.expression, siblingOfInlineText);
        }

        break;
      }

      case 'LogicalExpression': {
        traverse(node.right, siblingOfInlineText);

        break;
      }

      case 'ConditionalExpression': {
        traverse(node.consequent, siblingOfInlineText);
        traverse(node.alternate, siblingOfInlineText);

        break;
      }

      case 'Identifier': {
        const resolved = resolveIdentifierValue(context, node);
        if (resolved) traverse(resolved, siblingOfInlineText);

        break;
      }

      default:
        // Function/render-helper calls (CallExpression) are treated the same as unknown
        // custom components: opaque, not traversed.
        break;
    }
  };

  traverse(rootNode);
  return findings;
};

/**
 * Returns true if the receiver of a call looks like the toast service:
 *   - toasts.add()
 *   - notifications.toasts.add()
 *   - toastService.add() (where `const toastService = notifications.toasts`)
 */
const isToastsReceiver = (
  context: Rule.RuleContext,
  obj: TSESTree.Node,
  visited: Set<TSESTree.Node> = new Set()
): boolean => {
  if (visited.has(obj)) return false;

  visited.add(obj);

  if (obj.type === 'Identifier') {
    if (obj.name === 'toasts') return true;

    const resolved = resolveIdentifierValue(context, obj);

    return resolved !== null && isToastsReceiver(context, resolved, visited);
  }

  if (obj.type === 'MemberExpression' && obj.property.type === 'Identifier') {
    return obj.property.name === 'toasts';
  }

  return false;
};

interface MountCall {
  mountFn: string;
  mountArg: TSESTree.Node;
}

/**
 * Finds `mountFn()` calls reachable from a `text` property value, unwrapping the same
 * conditional shapes as `collectMountContent` (e.g. `condition ? mountReactNode(...) : 'text'`)
 * so a conditionally-chosen mount call isn't missed.
 */
const findMountCalls = (value: TSESTree.Node): MountCall[] => {
  switch (value.type) {
    case 'CallExpression': {
      if (value.callee.type !== 'Identifier' || !MOUNT_FUNCTIONS.has(value.callee.name)) {
        return [];
      }

      const mountArg = value.arguments[0];

      if (!mountArg || mountArg.type === 'SpreadElement') return [];

      return [{ mountFn: value.callee.name, mountArg }];
    }

    case 'LogicalExpression':
      return findMountCalls(value.right);

    case 'ConditionalExpression':
      return [...findMountCalls(value.consequent), ...findMountCalls(value.alternate)];

    default:
      return [];
  }
};

interface ToastMountArg {
  methodName: string;
  // null when the content came directly from `children` rather than a mount call.
  mountFn: string | null;
  mountArg: TSESTree.Node;
}

/**
 * Util that locates all `text: mountFn()` and `children: <jsx>` patterns inside a toast
 * method call and invokes the callback for each one. Unlike `text`, `children` is
 * typed as plain `ReactNode` (see EuiToastProps), so it needs no mount-call wrapper.
 */
const forEachToastMountArg = (
  context: Rule.RuleContext,
  node: Rule.Node,
  callback: (ctx: ToastMountArg) => void
): void => {
  const callNode = node as unknown as TSESTree.CallExpression;

  if (
    callNode.callee.type !== 'MemberExpression' ||
    callNode.callee.property.type !== 'Identifier' ||
    !TOAST_METHODS.has(callNode.callee.property.name)
  ) {
    return;
  }

  const methodName = callNode.callee.property.name;

  if (!isToastsReceiver(context, callNode.callee.object)) {
    return;
  }

  for (const arg of callNode.arguments) {
    if (arg.type !== 'ObjectExpression') continue;

    for (const prop of arg.properties) {
      if (prop.type !== 'Property' || prop.computed) continue;

      const propName = getPropertyKeyName(prop.key);

      if (propName === 'text') {
        for (const { mountFn, mountArg } of findMountCalls(prop.value)) {
          callback({ methodName, mountFn, mountArg });
        }
      } else if (propName === 'children') {
        callback({ methodName, mountFn: null, mountArg: prop.value });
      }
    }
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
      actionElementInChildren:
        'Pass `actionProps` to `{{method}}()` instead of embedding <{{elementName}}> directly in `children`.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node: Rule.Node) {
        forEachToastMountArg(context, node, ({ methodName, mountFn, mountArg }) => {
          const { actionElements } = collectMountContent(context, mountArg);

          for (const { node: actionNode, elementName } of actionElements) {
            context.report(
              mountFn
                ? {
                    node: actionNode as unknown as Rule.Node,
                    messageId: 'actionElementInMountContent',
                    data: { elementName, method: methodName, mountFn },
                  }
                : {
                    node: actionNode as unknown as Rule.Node,
                    messageId: 'actionElementInChildren',
                    data: { elementName, method: methodName },
                  }
            );
          }
        });
      },
    };
  },
};
