/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { CodeShouldBePerformant } from './code_should_be_performant';

const tsTester = [
  '@typescript-eslint/parser',
  new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2020,
      ecmaFeatures: { jsx: true },
    },
  }),
] as const;

const babelTester = [
  '@babel/eslint-parser',
  new RuleTester({
    parser: require.resolve('@babel/eslint-parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2020,
      requireConfigFile: false,
      babelOptions: { presets: ['@kbn/babel-preset/node_preset'] },
    },
  }),
] as const;

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run('@kbn/perf/code_should_be_performant', CodeShouldBePerformant, {
      valid: [
        // Using Promise.all instead of await in a loop
        {
          filename: 'foo.ts',
          code: `async function f(items){ const tasks = items.map(load); await Promise.all(tasks); }`,
        },
        // Array concat instead of spread in loop
        {
          filename: 'foo.ts',
          code: `function g(arr){ for (let i=0;i<10;i++){ const x = arr.concat(i); } }`,
        },
        // Object spread outside loops is fine
        { filename: 'foo.ts', code: `function h(obj){ const o = {...obj}; return o; }` },
        // map result used (not side-effects only)
        { filename: 'foo.ts', code: `const out = [1,2,3].map(x => x*2);` },
        // React: stable props (no inline objects/functions)
        {
          filename: 'comp.tsx',
          code: `function Comp({ onClick, style }){ return <button onClick={onClick} style={style}>x</button>; }`,
        },
        // React: memoized handler passed
        {
          filename: 'comp.tsx',
          code: `import { useCallback } from 'react'; function Comp(){ const onClick = useCallback(()=>{}, []); return <button onClick={onClick}>x</button>; }`,
        },
      ],

      invalid: [
        // await in loop
        {
          filename: 'foo.ts',
          code: `async function f(items){ for (const it of items){ await load(it); } }`,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // array spread in loop
        {
          filename: 'foo.ts',
          code: `function g(arr){ for (let i=0;i<10;i++){ const x=[...arr, i]; } }`,
          errors: [{ messageId: 'arraySpreadConcat' }],
        },
        // object spread in loop
        {
          filename: 'foo.ts',
          code: `function h(obj){ for (const k in obj){ const y = { ...obj, k }; } }`,
          errors: [{ messageId: 'largeObjectSpread' }],
        },
        // map used for side effects only
        {
          filename: 'foo.ts',
          code: `function s(arr){ arr.map(x => console.log(x)); }`,
          errors: [{ messageId: 'mapForSideEffects' }],
        },
        // JSON.parse in loop
        {
          filename: 'foo.ts',
          code: `function p(ss){ for (const s of ss){ JSON.parse(s); } }`,
          errors: [{ messageId: 'jsonParseInLoop' }],
        },
        // RegExp in loop
        {
          filename: 'foo.ts',
          code: `function r(strs){ for (const s of strs){ const re = new RegExp('a'); } }`,
          errors: [{ messageId: 'regexInLoop' }],
        },
        // React: inline handler in JSX
        {
          filename: 'comp.tsx',
          code: `const Comp = () => <button onClick={() => console.log('x')}>x</button>;`,
          errors: [{ messageId: 'jsxInlineFunction' }],
        },
        // React: inline function expression
        {
          filename: 'comp.tsx',
          code: `const Comp = () => <button onClick={function(){}} />;`,
          errors: [{ messageId: 'jsxInlineFunction' }],
        },
        // React: inline object literal prop
        {
          filename: 'comp.tsx',
          code: `const Comp = () => <div style={{ color: 'red' }} />;`,
          errors: [{ messageId: 'jsxInlineObject' }],
        },
        // React: inline array literal prop
        {
          filename: 'comp.tsx',
          code: `const Comp = () => <List items={[1,2,3]} />;`,
          errors: [{ messageId: 'jsxInlineObject' }],
        },
      ],
    });
  });
}
