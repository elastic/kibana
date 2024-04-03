/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleTester } from 'eslint';
import {
  EventGeneratingElementsShouldBeInstrumented,
  EVENT_GENERATING_ELEMENTS,
} from './event_generating_elements_should_be_instrumented';

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
      '@kbn/event_generating_elements_should_be_instrumented',
      EventGeneratingElementsShouldBeInstrumented,
      {
        valid: EVENT_GENERATING_ELEMENTS.map((element) => ({
          filename: 'foo.tsx',
          code: `<${element} data-test-subj="foo" />`,
        })),

        invalid: EVENT_GENERATING_ELEMENTS.map((element) => ({
          filename: 'foo.tsx',
          code: `<${element}>Value</${element}>`,
          errors: [
            {
              line: 1,
              message: `<${element}> should have a \`data-test-subj\` for telemetry purposes. Use the autofix suggestion or add your own.`,
            },
          ],
          output: `<${element} data-test-subj="Value${element
            .replace('Eui', '')
            .replace('Empty', '')
            .replace('Icon', '')}">Value</${element}>`,
        })),
      }
    );
  });
}
