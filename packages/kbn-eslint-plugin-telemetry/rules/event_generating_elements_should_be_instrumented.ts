/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import { AST_NODE_TYPES, TSESTree, TSNode } from '@typescript-eslint/typescript-estree';

import { checkNodeForExistingDataTestSubjProp } from '../helpers/check_node_for_existing_data_test_subj_prop';
import { getIntentFromNode } from '../helpers/get_intent_from_node';
import { getAppName } from '../helpers/get_app_name';
import { getFunctionName } from '../helpers/get_function_name';

export const EVENT_GENERATING_ELEMENTS = [
  'EuiButton',
  'EuiButtonEmpty',
  'EuiButtonIcon',
  'EuiLink',
  'EuiFieldText',
  'EuiFieldSearch',
  'EuiFieldNumber',
  'EuiSelect',
  'EuiRadioGroup',
  'EuiTextArea',
];

export const EventGeneratingElementsShouldBeInstrumented: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { getCwd, getFilename, sourceCode, report } = context;

    return {
      JSXIdentifier: (node: TSESTree.Node) => {
        if (!('name' in node)) {
          return;
        }

        const name = String(node.name);
        const range = node.range;
        const parent = node.parent;

        if (
          parent?.type !== AST_NODE_TYPES.JSXOpeningElement ||
          !EVENT_GENERATING_ELEMENTS.includes(name)
        ) {
          return;
        }

        const hasDataTestSubjProp = checkNodeForExistingDataTestSubjProp(parent, () =>
          // @ts-expect-error upgrade typescript v5.1.6
          sourceCode.getScope(node as TSNode)
        );

        if (hasDataTestSubjProp) {
          // JSXOpeningElement already has a prop for data-test-subj. Bail.
          return;
        }

        // Start building the suggestion.

        // 1. The app name
        const cwd = getCwd();
        const fileName = getFilename();
        const appName = getAppName(fileName, cwd);

        // 2. Component name
        // @ts-expect-error upgrade typescript v5.1.6
        const functionDeclaration = sourceCode.getScope(node as TSNode)
          .block as TSESTree.FunctionDeclaration;
        const functionName = getFunctionName(functionDeclaration);
        const componentName = `${functionName.charAt(0).toUpperCase()}${functionName.slice(1)}`;

        // 3. The intention of the element (i.e. "Select date", "Submit", "Cancel")
        const intent = getIntentFromNode(parent);

        // 4. The element name that generates the events
        const element = name.replace('Eui', '').replace('Empty', '').replace('Icon', '');

        const suggestion = `${appName}${componentName}${intent}${element}`; // 'o11yHeaderActionsSubmitButton'

        // 6. Report feedback to engineer
        report({
          node: node as any,
          message: `<${name}> should have a \`data-test-subj\` for telemetry purposes. Use the autofix suggestion or add your own.`,
          fix(fixer) {
            return fixer.insertTextAfterRange(range, ` data-test-subj="${suggestion}"`);
          },
        });
      },
    } as Rule.RuleListener;
  },
};
