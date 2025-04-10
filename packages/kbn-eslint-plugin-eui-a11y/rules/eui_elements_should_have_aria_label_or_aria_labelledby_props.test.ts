/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import {
  EuiElementsShouldHaveAriaLabelOrAriaLabelledbyProps,
  EUI_ELEMENTS_TO_CHECK,
  EUI_WRAPPING_ELEMENTS,
  A11Y_PROP_NAMES,
} from './eui_elements_should_have_aria_label_or_aria_labelledby_props';
import { lowerCaseFirstChar, sanitizeEuiElementName } from '../helpers/utils';

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

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run(
      '@kbn/eui_elements_should_have_aria_label_or_aria_labelledby_props',
      EuiElementsShouldHaveAriaLabelOrAriaLabelledbyProps,
      {
        valid: [
          // unwrapped elements with an existing a11y prop should be left alone
          {
            filename: 'foo.tsx',
            code: `<EuiButtonIcon aria-label="foo" />`,
          },
          { filename: 'foo.tsx', code: `<EuiButtonIcon aria-labelledby="foo" />` },
          {
            filename: 'foo.tsx',
            code: `<EuiButtonIcon label="foo" />`,
          },
          // wrapped elements with an existing a11y prop should be left alone
          {
            filename: 'foo.tsx',
            code: `<EuiFormRow aria-label="foo"><EuiButtonIcon /></EuiFormRow>`,
          },
          {
            filename: 'foo.tsx',
            code: `<EuiFormRow aria-labelledby="foo"><EuiButtonIcon /></EuiFormRow>`,
          },
          {
            filename: 'foo.tsx',
            code: `<EuiFormRow label="foo"><EuiButtonIcon label="foo" /></EuiFormRow>`,
          },
        ].concat(
          EUI_ELEMENTS_TO_CHECK.flatMap((element) =>
            ['unwrapped', ...EUI_WRAPPING_ELEMENTS].flatMap((wrapper) =>
              A11Y_PROP_NAMES.map((prop) => ({
                filename: 'foo.tsx',
                code:
                  wrapper === 'unwrapped'
                    ? `<${element} ${prop}="foo" />`
                    : `<${wrapper} ${prop}="foo"><${element} /></${wrapper}>`,
              }))
            )
          )
        ),

        invalid: [
          // unwrapped elements with a missing a11y prop should be reported.
          {
            filename: 'foo.tsx',
            code: `<EuiButtonIcon />`,
            errors: [
              {
                line: 1,
                message: `<EuiButtonIcon> should have a \`aria-label\` for a11y. Use the autofix suggestion or add your own.`,
              },
            ],
            output: `<EuiButtonIcon aria-label={i18n.translate('app_not_found_in_i18nrc.button.ariaLabel', { defaultMessage: '' })}  />
import { i18n } from '@kbn/i18n';`,
          },
          // if an element has a placeholder prop, use that for the default message of the aria-label.
          {
            filename: 'foo.tsx',
            code: `<EuiComboBox placeholder={i18n.translate('app_not_found_in_i18nrc.comboBox', { defaultMessage: 'Indices and Streams' })} />`,
            errors: [
              {
                line: 1,
                message: `<EuiComboBox> should have a \`aria-label\` for a11y. Use the autofix suggestion or add your own.`,
              },
            ],
            output: `<EuiComboBox aria-label={i18n.translate('app_not_found_in_i18nrc.indicesandStreamsComboBox.ariaLabel', { defaultMessage: 'Indices and Streams' })}  placeholder={i18n.translate('app_not_found_in_i18nrc.comboBox', { defaultMessage: 'Indices and Streams' })} />
import { i18n } from '@kbn/i18n';`,
          },
          // wrapped elements with a missing a11y prop should be reported.
          {
            filename: 'foo.tsx',
            code: `<EuiFormRow><EuiButtonIcon /></EuiFormRow>`,
            errors: [
              {
                line: 1,
                message: `<EuiButtonIcon> should have a \`aria-label\` for a11y. Use the autofix suggestion or add your own.`,
              },
            ],
            output: `<EuiFormRow aria-label={i18n.translate('app_not_found_in_i18nrc.button.ariaLabel', { defaultMessage: '' })} ><EuiButtonIcon /></EuiFormRow>
import { i18n } from '@kbn/i18n';`,
          },
          // wrapped elements with a missing a11y prop should be reported.
          {
            filename: 'foo.tsx',
            code: `<EuiFormRow><EuiButtonIcon /></EuiFormRow>`,
            errors: [
              {
                line: 1,
                message: `<EuiButtonIcon> should have a \`aria-label\` for a11y. Use the autofix suggestion or add your own.`,
              },
            ],
            output: `<EuiFormRow aria-label={i18n.translate('app_not_found_in_i18nrc.button.ariaLabel', { defaultMessage: '' })} ><EuiButtonIcon /></EuiFormRow>
import { i18n } from '@kbn/i18n';`,
          },
        ].concat(
          EUI_ELEMENTS_TO_CHECK.flatMap((element) =>
            ['unwrapped', ...EUI_WRAPPING_ELEMENTS].flatMap((wrapper) => ({
              filename: 'foo.tsx',
              code:
                wrapper === 'unwrapped'
                  ? `<${element} />`
                  : `<${wrapper}><${element} /></${wrapper}>`,
              errors: [
                {
                  line: 1,
                  message: `<${element}> should have a \`aria-label\` for a11y. Use the autofix suggestion or add your own.`,
                },
              ],
              output:
                wrapper === 'unwrapped'
                  ? `<${element} aria-label={i18n.translate('app_not_found_in_i18nrc.${lowerCaseFirstChar(
                      sanitizeEuiElementName(element).elementName
                    )}.ariaLabel', { defaultMessage: '' })}  />
import { i18n } from '@kbn/i18n';`
                  : `<${wrapper} aria-label={i18n.translate('app_not_found_in_i18nrc.${lowerCaseFirstChar(
                      sanitizeEuiElementName(element).elementName
                    )}.ariaLabel', { defaultMessage: '' })} ><${element} /></${wrapper}>
import { i18n } from '@kbn/i18n';`,
            }))
          )
        ),
      }
    );
  });
}
