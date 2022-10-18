/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { Rule } from 'eslint';

const componentNames = [
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

export const eventGeneratingElementsShouldBeInstrumented = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    return {
      JSXIdentifier(node) {
        // if (node.name.type !== 'JSXIdentifier' || !componentNames.includes(node.name.name)) {
        //   return;
        // }
        // const hasDataTestId = node.attributes.some(
        //   (attr) => attr.type === 'JSXAttribute' && attr.name.name === 'data-test-subj'
        // );
        // if (!hasDataTestId) {
        //   context.report({
        //     node,
        //     message: `<${node.name.name}> should have a \`data-test-subj\` for telemetry purposes. Consider adding it.`,
        //     fix: function (fixer) {
        //       return fixer.insertTextAfterRange(node.name.range, ' data-test-subj=""');
        //     },
        //   });
        // }
      },
    };
  },
};
