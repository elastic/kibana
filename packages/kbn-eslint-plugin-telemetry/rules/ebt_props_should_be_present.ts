/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
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
 * Interactive EUI components and native HTML elements that should carry EBT
 * tracking attributes (`data-ebt-action` and `data-ebt-element`).
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

        const hasEbtProps = checkNodeForExistingEbtProps(parent, () =>
          // @ts-expect-error upgrade typescript v5.1.6
          sourceCode.getScope(node as TSNode)
        );

        if (hasEbtProps) {
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
