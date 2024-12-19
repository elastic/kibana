/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { NoCssColor } from './no_css_color';

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
    errors: [{ messageId: 'noCssColorSpecific' }],
  },
  {
    name: 'Raises an error when a CSS color references a string variable that is passed to style prop of a JSX element',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';

    function TestComponent() {
      const codeColor = '#dd4040';
      return (
        <EuiCode style={{ color: codeColor }}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCSSColorSpecificDeclaredVariable' }],
  },
  {
    name: 'Raises an error when a CSS color is used in an object variable that is passed to style prop of a JSX element',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';

    function TestComponent() {
      const codeStyle = { color: '#dd4040' };
      return (
        <EuiCode style={codeStyle}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCSSColorSpecificDeclaredVariable' }],
  },
  {
    name: 'Raises an error when an object property that is a literal CSS color is used for the background property in a JSX style attribute',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';

    function TestComponent() {
      const baseStyle = { background: 'rgb(255, 255, 255)' };

      return (
        <EuiCode style={{ background: baseStyle.background }}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCSSColorSpecificDeclaredVariable' }],
  },
  {
    name: 'Raises an error when a CSS color is used in a variable that is spread into another variable that is passed to style prop of a JSX element',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';

    function TestComponent() {
      const baseStyle = { background: 'rgb(255, 255, 255)' };
      const codeStyle = { margin: '5px', ...baseStyle };
      return (
        <EuiCode style={codeStyle}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCSSColorSpecificDeclaredVariable' }],
  },
  {
    name: 'Raises an error when a CSS color is used for the background property in a JSX style attribute',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';

    function TestComponent() {
      return (
        <EuiCode style={{ background: '#dd4040' }}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColorSpecific' }],
  },
  {
    name: 'Raises an error when a CSS color for the color property is used in a JSX css attribute for EuiComponents',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';

    function TestComponent() {
      return (
        <EuiCode css={{ color: '#dd4040' }}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColorSpecific' }],
  },
  {
    name: 'Raises an error when a CSS color for the color property is used in with the tagged template css function',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import { css } from '@emotion/css';

    const codeColor = css\` color: #dd4040; \`;
    `,
    errors: [{ messageId: 'noCssColor' }],
  },
  {
    name: 'Raises an error when a CSS color for the color property is used in a JSX css attribute for EuiComponents with the css template function',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';
    import { css } from '@emotion/css';

    function TestComponent() {
      return (
        <EuiCode css={css\` color: #dd4040; \`}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColor' }],
  },
  {
    name: 'Raises an error when a CSS color for the color property is used in a JSX className attribute for EuiComponents with the css template function defined outside the scope of the component',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';
    import { css } from '@emotion/css';

    const codeCss = css({
      color: '#dd4040',
    })

    function TestComponent() {
      return (
        <EuiCode css={codeCss}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCSSColorSpecificDeclaredVariable' }],
  },
  {
    name: 'Raises an error when a CSS color for the color property is used in a JSX className attribute for EuiComponents with the css template function defined outside the scope of the component',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';
    import { css } from '@emotion/css';

    const codeCss = css\` color: #dd4040; \`

    function TestComponent() {
      return (
        <EuiCode css={codeCss}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColor' }],
  },
  {
    name: 'Raises an error when a CSS color for the color property is used in a JSX css attribute for EuiComponents with an arrow function',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';

    function TestComponent() {
      return (
        <EuiCode css={() => ({ color: '#dd4040' })}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColorSpecific' }],
  },
  {
    name: 'Raises an error when a CSS color for the color property is used in a JSX css attribute for EuiComponents with a regular function',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';

    function TestComponent() {
      return (
        <EuiCode css={function () { return { color: '#dd4040' }; }}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColorSpecific' }],
  },
  {
    name: 'Raises an error when a CSS color for the color property is used in a JSX className attribute for EuiComponents with the css template function',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';
    import { css } from '@emotion/css';

    function TestComponent() {
      return (
        <EuiCode className={css\` color: #dd4040; \`}>This is a test</EuiCode>
      )
    }`,
    errors: [{ messageId: 'noCssColor' }],
  },
];

const valid: RuleTester.ValidTestCase[] = [
  {
    name: 'Does not raise an error when a CSS color is not used in a JSX css prop attribute',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
    import React from 'react';
    import { EuiCode } from '@elastic/eui';
    import { css } from '@emotion/react';
    function TestComponent() {
      return (
        <EuiCode css={css\`
            border-top: none;
            border-radius: 0 0 6px 6px;
          \`}>This is a test</EuiCode>
      )
    }`,
  },
];

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run('@kbn/no_css_color', NoCssColor, {
      valid,
      invalid,
    });
  });
}
