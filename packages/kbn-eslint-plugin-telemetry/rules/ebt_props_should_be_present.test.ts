/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { EbtPropsShouldBePresent, EBT_INTERACTIVE_ELEMENTS } from './ebt_props_should_be_present';

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
    tester.run('@kbn/telemetry/ebt_props_should_be_present', EbtPropsShouldBePresent, {
      valid: [
        // Direct data-ebt-* attributes
        ...EBT_INTERACTIVE_ELEMENTS.map((element) => ({
          filename: 'foo.tsx',
          code: `<${element} data-ebt-action="someAction" data-ebt-element="someElement" data-ebt-detail="someDetail" />`,
        })),
        // Variable spread with EBT keys — should not be flagged
        ...EBT_INTERACTIVE_ELEMENTS.map((element) => ({
          filename: 'foo.tsx',
          code: `function Foo() { const ebtProps = { 'data-ebt-action': 'a', 'data-ebt-element': 'e', 'data-ebt-detail': 'd' }; return <${element} {...ebtProps} />; }`,
        })),
        // getEbtProps() spread — canonical EBT usage
        ...EBT_INTERACTIVE_ELEMENTS.map((element) => ({
          filename: 'foo.tsx',
          code: `<${element} {...getEbtProps({ action: 'foo', element: 'bar' })} />`,
        })),
        // Custom component with onClick + EBT via getEbtProps — should not be flagged
        {
          filename: 'foo.tsx',
          code: `function Foo() { return <CustomWrapper {...getEbtProps({ action: 'a', element: 'e', detail: 'd' })} onClick={fn} />; }`,
        },
        // Custom component with no onClick — not interactive, should not be flagged
        {
          filename: 'foo.tsx',
          code: `<CustomWrapper className="foo" />`,
        },
      ],

      invalid: [
        // No attributes at all
        ...EBT_INTERACTIVE_ELEMENTS.map((element) => ({
          filename: 'foo.tsx',
          code: `<${element}>Value</${element}>`,
          errors: [
            {
              line: 1,
              message: `<${element}> is missing EBT tracking attributes. Add \`data-ebt-action\` and \`data-ebt-element\` (use \`getEbtProps()\` from \`@kbn/ebt-click\`).`,
            },
          ],
        })),
        // Empty object spread — should still be flagged
        {
          filename: 'foo.tsx',
          code: `<EuiButton {...{}} data-test-subj="test">Click</EuiButton>`,
          errors: [
            {
              message: `<EuiButton> is missing EBT tracking attributes. Add \`data-ebt-action\` and \`data-ebt-element\` (use \`getEbtProps()\` from \`@kbn/ebt-click\`).`,
            },
          ],
        },
        // Spread of unrelated function — should still be flagged
        {
          filename: 'foo.tsx',
          code: `<EuiButton {...someOtherFn()}>Click</EuiButton>`,
          errors: [
            {
              message: `<EuiButton> is missing EBT tracking attributes. Add \`data-ebt-action\` and \`data-ebt-element\` (use \`getEbtProps()\` from \`@kbn/ebt-click\`).`,
            },
          ],
        },
        // Custom component with onClick but no EBT props — should be flagged
        {
          filename: 'foo.tsx',
          code: `<CustomWrapper onClick={fn}>Click</CustomWrapper>`,
          errors: [
            {
              message: `<CustomWrapper> is missing EBT tracking attributes. Add \`data-ebt-action\` and \`data-ebt-element\` (use \`getEbtProps()\` from \`@kbn/ebt-click\`).`,
            },
          ],
        },
        // Native elements with onClick not already in the list — should be flagged
        {
          filename: 'foo.tsx',
          code: `<div onClick={fn}>Click</div>`,
          errors: [
            {
              message: `<div> is missing EBT tracking attributes. Add \`data-ebt-action\` and \`data-ebt-element\` (use \`getEbtProps()\` from \`@kbn/ebt-click\`).`,
            },
          ],
        },
        {
          filename: 'foo.tsx',
          code: `<span onClick={fn}>Click</span>`,
          errors: [
            {
              message: `<span> is missing EBT tracking attributes. Add \`data-ebt-action\` and \`data-ebt-element\` (use \`getEbtProps()\` from \`@kbn/ebt-click\`).`,
            },
          ],
        },
        // Variable initializer with a spread inside — must not crash (TypeError guard)
        {
          filename: 'foo.tsx',
          code: `function Foo() { const base = {}; const props = { ...base, 'data-ebt-action': 'a' }; return <EuiButton {...props}>Click</EuiButton>; }`,
          errors: [
            {
              message: `<EuiButton> is missing EBT tracking attributes. Add \`data-ebt-action\` and \`data-ebt-element\` (use \`getEbtProps()\` from \`@kbn/ebt-click\`).`,
            },
          ],
        },
      ],
    });
  });
}
