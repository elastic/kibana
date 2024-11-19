/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { PreferCSSAttributeForEuiComponents } from './prefer_css_attribute_for_eui_components';

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

const invalid: RuleTester.InvalidTestCase[] = [
  {
    name: 'Prefer the JSX css attribute for EUI components',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';
    
    function TestComponent() {
      return (
        <EuiCode style={{ color: '#dd4040' }}>This is a test</EuiCode>
      )
    }`,
    errors: [
      {
        messageId: 'preferCSSAttributeForEuiComponents',
      },
    ],
    output: `
    import React from 'react';
    
    function TestComponent() {
      return (
        <EuiCode css={{ color: '#dd4040' }}>This is a test</EuiCode>
      )
    }`,
  },
];

const valid: RuleTester.ValidTestCase[] = [
  {
    name: invalid[0].name,
    filename: invalid[0].filename,
    code: invalid[0].output as string,
  },
];

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run('@kbn/prefer_css_attribute_for_eui_components', PreferCSSAttributeForEuiComponents, {
      valid,
      invalid,
    });
  });
}
