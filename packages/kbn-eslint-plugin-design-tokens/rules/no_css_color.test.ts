/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { noCssColor } from './no_css_color';

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
    name: 'Raises an error when a CSS color is used in a JSX style attribute',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';
    
    function TestComponent() {
      return (
        <EuiCode style={{ color: '#dd4040' }}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColor' }],
  },
  {
    name: 'Raises an error when a CSS color is used in a JSX css attribute for EuiComponents',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';
    
    function TestComponent() {
      return (
        <EuiCode css={{ color: '#dd4040' }}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColor' }],
  },
  {
    name: 'Raises an error when a CSS color is used in a JSX css attribute for EuiComponents with the css template function',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';
    
    function TestComponent() {
      return (
        <EuiCode css={css\`{ color: '#dd4040' }\`}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColor' }],
  },
  {
    name: 'Raises an error when a CSS color is used in a JSX css attribute for EuiComponents with regular function',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';
    
    function TestComponent() {
      return (
        <EuiCode css={() => ({ color: '#dd4040' })}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColor' }],
  },
];

const valid: RuleTester.ValidTestCase[] = [];

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run('@kbn/no_css_color', noCssColor, {
      valid,
      invalid,
    });
  });
}
