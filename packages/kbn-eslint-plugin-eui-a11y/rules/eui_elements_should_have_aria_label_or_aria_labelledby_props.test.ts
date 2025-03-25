/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { EuiElementsShouldHaveAriaLabelOrAriaLabelledbyProps } from './eui_elements_should_have_aria_label_or_aria_labelledby_props';

const tsTester = [
  '@typescript-eslint/parser',
  new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2018,
      ecmaFeatures: {
        jsx: true,
      },
    },
  }),
] as const;

const babelTester = [
  '@babel/eslint-parser',
  new RuleTester({
    parser: require.resolve('@babel/eslint-parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2018,
      requireConfigFile: false,
      babelOptions: {
        presets: ['@kbn/babel-preset/node_preset'],
      },
    },
  }),
] as const;

const EUI_ELEMENTS = [
  ['EuiButtonIcon', 'Button'],
  ['EuiButtonEmpty', 'Button'],
  ['EuiBetaBadge', 'Beta Badge'],
  ['EuiSelect', 'Select'],
  ['EuiSelectWithWidth', 'Select'],
];

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run(
      '@kbn/eui_elements_should_have_aria_label_or_aria_labelledby_props',
      EuiElementsShouldHaveAriaLabelOrAriaLabelledbyProps,
      {
        valid: EUI_ELEMENTS.map((element) => ({
          filename: 'foo.tsx',
          code: `<${element[0]} aria-label="foo" />`,
        })),

        invalid: EUI_ELEMENTS.map((element) => {
          return {
            filename: 'foo.tsx',
            code: `<${element[0]}>Value Thing hello</${element[0]}>`,
            errors: [
              {
                line: 1,
                message: `<${element[0]}> should have a \`aria-label\` for a11y. Use the autofix suggestion or add your own.`,
              },
            ],
            output: `<${element[0]} aria-label={i18n.translate('app_not_found_in_i18nrc..ValueThinghelloariaLabel', { defaultMessage: 'Value Thing hello ${element[1]}' })}>Value Thing hello</${element[0]}>
import { i18n } from '@kbn/i18n';`,
          };
        }),
      }
    );
  });
}
