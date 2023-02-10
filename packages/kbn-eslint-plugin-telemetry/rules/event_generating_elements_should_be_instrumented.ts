/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/typescript-estree';

import { getIntentFromNodeArray } from '../helpers/get_intent_from_node';
import { getAppName } from '../helpers/get_app_name';

const EVENT_GENERATING_ELEMENTS = [
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

interface NodeParentExtension {
  parent: SomeNode;
  children: SomeNode;
}
export type SomeNode = TSESTree.Node & NodeParentExtension;

export const eventGeneratingElementsShouldBeInstrumented: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { getCwd, getFilename, getScope, report } = context;

    return {
      JSXIdentifier: (node: TSESTree.Node) => {
        if ('name' in node) {
          const name = String(node.name);
          const range = node.range;
          const parent = node.parent as SomeNode;

          // We want to check the attributes of an JSXOpeningElement that is part of an array of
          // element names that generate events. Return early if that's not the case.
          if (parent?.type !== 'JSXOpeningElement' || !EVENT_GENERATING_ELEMENTS.includes(name)) {
            return;
          }

          const hasDataTestSubj = (parent.attributes || []).find(
            (attr) => attr.type === 'JSXAttribute' && attr.name.name === 'data-test-subj'
          );

          if (!hasDataTestSubj) {
            // Start getting the different parts of the autosuggestion.

            // 1. Path to component
            const cwd = getCwd();
            const fileName = getFilename();
            const appName = getAppName(fileName, cwd);

            // 2. Component name
            const functionDeclaration = getScope().block as TSESTree.FunctionDeclaration;
            const componentName = `${functionDeclaration.id?.name
              .charAt(0)
              .toUpperCase()}${functionDeclaration.id?.name.slice(1)}`;

            // 3. The element name that generates events which can be instrumented
            const eventGeneratingElement = name.replace('Eui', '');

            // 4. The intention of the element (i.e. "Select date", "Submit", "Cancel")
            const potentialIntent = getIntentFromNodeArray(
              Array.isArray(parent.parent.children) ? parent.parent.children : []
            );

            // 5. Putting it together
            const dataTestSubjectSuggestion = `${appName}${componentName}${potentialIntent}${eventGeneratingElement}`;

            // 6. Report feedback to engineer
            report({
              node: node as any,
              message: `<${name}> should have a \`data-test-subj\` and \`data-test-purpose\` attribute for telemetry purposes. Consider adding them.`,
              fix(fixer) {
                return fixer.insertTextAfterRange(
                  range,
                  ` data-test-subj="${dataTestSubjectSuggestion}"`
                );
              },
            });
          }
        }
      },
    } as Rule.RuleListener;
  },
};
