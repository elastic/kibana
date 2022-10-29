/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import type { Rule } from 'eslint';
import { getIntentFromNodeArray } from '../helpers/get_intent_from_node';
import { getPathToComponent } from '../helpers/get_path_to_component';

const eventGeneratingElementNames = [
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

export const eventGeneratingElementsShouldBeInstrumented: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { getCwd, getFilename, report } = context;

    return {
      JSXIdentifier(node: any) {
        const { name, parent } = node;

        // Return early if JSX element is not an opening element or part of pre-determined list of elements
        if (parent.type !== 'JSXOpeningElement' || !eventGeneratingElementNames.includes(name)) {
          return;
        }

        const hasDataTestSubj = (node.parent.attributes || []).find(
          (attr: any) => attr.type === 'JSXAttribute' && attr.name.name === 'data-test-subj'
        );

        if (!hasDataTestSubj) {
          const { dir } = path.parse(getFilename());
          const cwd = getCwd();
          const relativePathToFile = dir.replace(cwd, '');

          // Get different partials to use for autofix suggestion:
          const pathToComponent = getPathToComponent(relativePathToFile);

          const componentName = (context.getScope() as any).block?.id?.name?.toLowerCase();

          const eventGeneratingElement = `${name.replace('Eui', '').toLowerCase()}`;

          const potentialIntent = getIntentFromNodeArray(
            Array.isArray(parent.parent.children) && parent.parent.children.length
              ? parent.parent.children
              : []
          );

          const dataTestSubjectSuggestion = `${pathToComponent}|${componentName}|${eventGeneratingElement}|${potentialIntent}`;

          // Give feedback
          report({
            node,
            message: `<${node.name}> should have a \`data-test-subj\` attribute for telemetry purposes. Consider adding it.`,
            fix(fixer) {
              return fixer.insertTextAfterRange(
                node.range,
                ` data-test-subj="${dataTestSubjectSuggestion}"`
              );
            },
          });
        }
      },
    };
  },
};
