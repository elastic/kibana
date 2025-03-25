/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { Node } from 'estree';

import { checkNodeForExistingAriaLabelProp } from '../helpers/check_node_for_existing_data_test_subj_prop';
import { getIntentFromNode } from '../helpers/get_intent_from_node';

export const EUI_ELEMENTS = [
  'EuiButtonIcon',
  'EuiButtonEmpty',
  'EuiBetaBadge',
  'EuiSelect',
  'EuiSelectWithWidth',
];

export const EuiElementsShouldHaveAriaLabelOrAriaLabelledbyProps: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { report, sourceCode } = context;

    return {
      JSXIdentifier: (node: TSESTree.Node) => {
        if (!('name' in node)) {
          return;
        }

        const name = String(node.name);
        const range = node.range;
        const parent = node.parent;

        if (parent?.type !== AST_NODE_TYPES.JSXOpeningElement || !EUI_ELEMENTS.includes(name)) {
          return;
        }

        const hasAriaLabelProp = checkNodeForExistingAriaLabelProp(parent, () =>
          sourceCode.getScope(node as Node)
        );

        if (hasAriaLabelProp) return; // JSXOpeningElement already has a prop for aria-label. Bail.

        // Start building the suggestion.

        // 1. The intention of the element (i.e. "Select date", "Submit", "Cancel")
        const intent = getIntentFromNode(parent);

        // 2. The element name that generates the events
        const element = (
          name
            .replace('Eui', '')
            .replace('Empty', '')
            .replace('Icon', '')
            .replace('WithWidth', '')
            .match(/[A-Z][a-z]*/g) || []
        ).join(' ');

        const suggestion = `${intent}${element}`; // 'Actions Button'

        // 3. Report feedback to engineer
        report({
          node: node as any,
          message: `<${name}> should have a \`aria-label\` for a11y. Use the autofix suggestion or add your own.`,
          fix(fixer) {
            return fixer.insertTextAfterRange(range, ` aria-label="${suggestion}"`);
          },
        });
      },
    } as Rule.RuleListener;
  },
};
