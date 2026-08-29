/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule, Scope } from 'eslint';
import type { TSESTree, TSNode } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { checkNodeForExistingEbtProps } from '../helpers/check_node_for_existing_ebt_props';

const hasOnClickProp = (openingEl: TSESTree.JSXOpeningElement): boolean =>
  openingEl.attributes.some(
    (attr) =>
      attr.type === AST_NODE_TYPES.JSXAttribute &&
      attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
      attr.name.name === 'onClick'
  );

/**
 * True if the element receives EBT context via props (`ebt`, `ebtElement`,
 * `ebtDetail`, ...). Custom components following this convention apply the
 * `data-ebt-*` attributes internally, so their usage sites are instrumented.
 */
const hasEbtContextProp = (openingEl: TSESTree.JSXOpeningElement): boolean =>
  openingEl.attributes.some(
    (attr) =>
      attr.type === AST_NODE_TYPES.JSXAttribute &&
      attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
      /^ebt([A-Z]|$)/.test(attr.name.name)
  );

/**
 * True if an enclosing JSX element in the same file already carries EBT
 * tracking attributes. The click tracker attributes a click to the nearest
 * ancestor with `data-ebt-*`, so nested interactive elements inside an
 * instrumented container are tracked through it.
 */
const hasInstrumentedJsxAncestor = (
  openingEl: TSESTree.JSXOpeningElement,
  getScopeFor: (node: TSESTree.Node) => Scope.Scope
): boolean => {
  let current: TSESTree.Node | undefined = openingEl.parent;
  while (current) {
    if (current.type === AST_NODE_TYPES.JSXElement) {
      const ancestor = current;
      if (
        ancestor.openingElement !== openingEl &&
        checkNodeForExistingEbtProps(ancestor.openingElement, () => getScopeFor(ancestor))
      ) {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
};

/**
 * Interactive EUI components and native HTML elements that should carry EBT
 * tracking attributes (`data-ebt-action` and `data-ebt-element`).
 *
 * Intentionally narrower than EVENT_GENERATING_ELEMENTS: EuiField* and
 * EuiTextArea are excluded because text inputs generate change/input events
 * rather than distinct click actions suitable for EBT tracking. Native
 * interactive elements are included because custom interactive wrappers are
 * often built on top of them (e.g. styled-components wrapping a div/button).
 */
export const EBT_INTERACTIVE_ELEMENTS = [
  // EUI components
  'EuiButton',
  'EuiButtonEmpty',
  'EuiButtonIcon',
  'EuiLink',
  'EuiSelect',
  'EuiRadioGroup',
  // Native HTML interactive elements
  'button',
  'a',
  'select',
  'input',
];

export const EbtPropsShouldBePresent: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Interactive elements should carry `data-ebt-action` and `data-ebt-element` attributes for EBT click tracking. Use `getEbtProps()` from `@kbn/ebt-click`.',
    },
  },
  create(context) {
    const { report, sourceCode } = context;

    return {
      JSXIdentifier: (node: TSESTree.Node) => {
        if (!('name' in node)) {
          return;
        }

        const name = String(node.name);
        const parent = node.parent;

        if (parent?.type !== AST_NODE_TYPES.JSXOpeningElement) {
          return;
        }

        const isKnownInteractive = EBT_INTERACTIVE_ELEMENTS.includes(name);
        const isUnknownWithOnClick = !isKnownInteractive && hasOnClickProp(parent);

        if (!isKnownInteractive && !isUnknownWithOnClick) {
          return;
        }

        // Custom components receiving EBT context via props apply the
        // attributes internally — their usage sites are instrumented.
        if (isUnknownWithOnClick && hasEbtContextProp(parent)) {
          return;
        }

        const getScopeFor = (n: TSESTree.Node) =>
          // @ts-expect-error upgrade typescript v5.1.6
          sourceCode.getScope(n as TSNode);

        const hasEbtProps = checkNodeForExistingEbtProps(parent, () => getScopeFor(node));

        if (hasEbtProps) {
          return;
        }

        if (hasInstrumentedJsxAncestor(parent, getScopeFor)) {
          return;
        }

        report({
          node: node as any,
          message: `<${name}> is missing EBT tracking attributes. Add \`data-ebt-action\` and \`data-ebt-element\` (use \`getEbtProps()\` from \`@kbn/ebt-click\`).`,
        });
      },
    } as Rule.RuleListener;
  },
};
