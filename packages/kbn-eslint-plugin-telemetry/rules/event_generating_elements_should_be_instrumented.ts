/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/typescript-estree';

import { getIntentFromNode } from '../helpers/get_intent_from_node';
import { getAppName } from '../helpers/get_app_name';

export const EVENT_GENERATING_ELEMENTS = [
  'EuiButton',
  'EuiButtonEmpty',
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
    const { getCwd, getFilename, getScope, report } = context;

    return {
      JSXIdentifier: (node: TSESTree.Node) => {
        if (!('name' in node)) {
          return;
        }

        const name = String(node.name);
        const range = node.range;
        const parent = node.parent;

        if (parent?.type !== 'JSXOpeningElement' || !EVENT_GENERATING_ELEMENTS.includes(name)) {
          return;
        }

        const hasDataTestSubj = (parent.attributes || []).find(
          (attr) => attr.type === 'JSXAttribute' && attr.name.name === 'data-test-subj'
        );

        if (hasDataTestSubj) {
          // JSXOpeningElement already has a value for data-test-subj. Bail.
          return;
        }

        // Start building the autosuggestion.

        // 1. The app name
        const cwd = getCwd();
        const fileName = getFilename();
        const appName = getAppName(fileName, cwd);

        // 2. Component name
        const functionDeclaration = getScope().block as TSESTree.FunctionDeclaration;
        const componentName = `${functionDeclaration.id?.name
          .charAt(0)
          .toUpperCase()}${functionDeclaration.id?.name.slice(1)}`;

        // 3. The intention of the element (i.e. "Select date", "Submit", "Cancel")
        const intent = getIntentFromNode(parent);

        // 4. The element name that generates the events
        const eventGeneratingElement = name.replace('Eui', '');

        // 5. Putting it together
        const dataTestSubjectSuggestion = `${appName}${componentName}${intent}${eventGeneratingElement}`;

        // 6. Report feedback to engineer
        report({
          node: node as any,
          message: `<${name}> should have a \`data-test-subj\` for telemetry purposes. Consider adding it.`,
          fix(fixer) {
            return fixer.insertTextAfterRange(
              range,
              ` data-test-subj="${dataTestSubjectSuggestion}"`
            );
          },
        });
      },
    } as Rule.RuleListener;
  },
};
