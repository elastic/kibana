/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleTester } from 'eslint';
import { RequireImportRule } from './require_import';
import dedent from 'dedent';

const fmt = (str: TemplateStringsArray) => dedent(str) + '\n';

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
    tester.run('@kbn/imports/require_import', RequireImportRule, {
      valid: [
        {
          options: ['mocha'],
          filename: 'foo.ts',
          code: fmt`
            import 'mocha';

            /// <reference types="mocha"/>
            
            describe(( ) => {
              before(( ) => {
              });
            });
            `,
        },
      ],
      invalid: [
        {
          options: ['mocha'],
          filename: 'foo.ts',
          code: fmt`
            describe(( ) => {
              before(( ) => {
              });
            });
            `,
          output: fmt`/// <reference types="mocha"/>

            describe(( ) => {
              before(( ) => {
              });
            });`,
          errors: [
            {
              line: 1,
              message: `Required module 'mocha' is not imported as a type reference`,
            },
          ],
        },
      ],
    });
  });
}
