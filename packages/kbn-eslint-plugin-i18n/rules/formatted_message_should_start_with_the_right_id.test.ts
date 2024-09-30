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
  FormattedMessageShouldStartWithTheRightId,
  RULE_WARNING_MESSAGE,
} from './formatted_message_should_start_with_the_right_id';

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
      '@kbn/formatted_message_should_start_with_the_right_id',
      FormattedMessageShouldStartWithTheRightId,
      {
        valid: [
          {
            name: 'When a string literal is passed to FormattedMessage the ID attribute should start with the correct i18n identifier, and if no existing defaultMessage is passed, it should add an empty default.',
            filename:
              '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
            code: `<FormattedMessage id="xpack.observability." defaultMessage="" />`,
          },
          {
            name: 'When a string literal is passed to FormattedMessage the ID attribute should start with the correct i18n identifier, and if an existing id and defaultMessage is passed, it should leave them alone.',
            filename:
              '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
            code: `<FormattedMessage id="xpack.observability.testComponent" defaultMessage="foo" />`,
          },
        ],
        invalid: [
          {
            name: 'When a string literal is passed to FormattedMessage the ID attribute should start with the correct i18n identifier, and if no existing defaultMessage is passed, it should add an empty default.',
            filename:
              '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
            code: `
  import { FormattedMessage } from '@kbn/i18n-react';

  function TestComponent() {
    return <FormattedMessage id="foo.bar.baz" />;
  }`,
            errors: [
              {
                line: 5,
                message: RULE_WARNING_MESSAGE,
              },
            ],
            output: `
  import { FormattedMessage } from '@kbn/i18n-react';

  function TestComponent() {
    return <FormattedMessage id="xpack.observability.bar.baz" defaultMessage="" />;
  }`,
          },
          {
            name: 'When a string literal is passed to the ID attribute of <FormattedMessage /> and the root of the i18n identifier is not correct, it should keep the existing identifier but only update the right base app, and keep the default message if available.',
            filename:
              '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
            code: `
  import { FormattedMessage } from '@kbn/i18n-react';

  function TestComponent() {
    return <FormattedMessage id="foo.bar.baz" defaultMessage="giraffe" />;
  }`,
            errors: [
              {
                line: 5,
                message: RULE_WARNING_MESSAGE,
              },
            ],
            output: `
  import { FormattedMessage } from '@kbn/i18n-react';

  function TestComponent() {
    return <FormattedMessage id="xpack.observability.bar.baz" defaultMessage="giraffe" />;
  }`,
          },
          {
            name: 'When no string literal is passed to the ID attribute of <FormattedMessage /> it should start with the correct i18n identifier.',
            filename:
              '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
            code: `
  import { FormattedMessage } from '@kbn/i18n-react';

  function TestComponent() {
    return <FormattedMessage />;
  }`,
            errors: [
              {
                line: 5,
                message: RULE_WARNING_MESSAGE,
              },
            ],
            output: `
  import { FormattedMessage } from '@kbn/i18n-react';

  function TestComponent() {
    return <FormattedMessage id="xpack.observability.testComponent." defaultMessage="" />;
  }`,
          },
          {
            name: 'When i18n is not imported yet, the rule should add it.',
            filename:
              '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
            code: `
  function TestComponent() {
    return <FormattedMessage />;
  }`,
            errors: [
              {
                line: 3,
                message: RULE_WARNING_MESSAGE,
              },
            ],
            output: `
import { FormattedMessage } from '@kbn/i18n-react';
  function TestComponent() {
    return <FormattedMessage id="xpack.observability.testComponent." defaultMessage="" />;
  }`,
          },
        ],
      }
    );
  });
}
