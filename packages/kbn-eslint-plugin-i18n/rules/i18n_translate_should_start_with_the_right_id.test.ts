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
  I18nTranslateShouldStartWithTheRightId,
  RULE_WARNING_MESSAGE,
  NO_IDENTIFIER_MESSAGE,
} from './i18n_translate_should_start_with_the_right_id';

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
    name: 'When a string literal is passed to i18n.translate, it should start with the correct i18n identifier, and if no existing defaultMessage is passed, it should add an empty default.',
    filename: '/x-pack/solutions/observability/plugins/observability/public/test_component.ts',
    code: `
import { i18n } from '@kbn/i18n';

function TestComponent() {
  const foo = i18n.translate('foo');
}`,
    errors: [
      {
        line: 5,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import { i18n } from '@kbn/i18n';

function TestComponent() {
  const foo = i18n.translate('xpack.observability.', { defaultMessage: '' });
}`,
  },
  {
    name: 'When a string literal is passed to i18n.translate, and the root of the i18n identifier is not correct, it should keep the existing identifier but only update the right base app.',
    filename: '/x-pack/solutions/observability/plugins/observability/public/test_component.ts',
    code: `
import { i18n } from '@kbn/i18n';

function TestComponent() {
  const foo = i18n.translate('foo.bar.baz');
}`,
    errors: [
      {
        line: 5,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import { i18n } from '@kbn/i18n';

function TestComponent() {
  const foo = i18n.translate('xpack.observability.bar.baz', { defaultMessage: '' });
}`,
  },
  {
    name: 'When a string literal is passed to i18n.translate, and the root of the i18n identifier is not correct, it should keep the existing identifier but only update the right base app, and keep the default message if available.',
    filename: '/x-pack/solutions/observability/plugins/observability/public/test_component.ts',
    code: `
import { i18n } from '@kbn/i18n';

function TestComponent() {
  const foo = i18n.translate('foo.bar.baz', { defaultMessage: 'giraffe' });
}`,
    errors: [
      {
        line: 5,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import { i18n } from '@kbn/i18n';

function TestComponent() {
  const foo = i18n.translate('xpack.observability.bar.baz', { defaultMessage: 'giraffe' });
}`,
  },
  {
    name: 'When no string literal is passed to i18n.translate, it should start with the correct i18n identifier.',
    filename: '/x-pack/solutions/observability/plugins/observability/public/test_component.ts',
    code: `
import { i18n } from '@kbn/i18n';

function TestComponent() {
  const foo = i18n.translate();
}`,
    errors: [
      {
        line: 5,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import { i18n } from '@kbn/i18n';

function TestComponent() {
  const foo = i18n.translate('xpack.observability.testComponent.', { defaultMessage: '' });
}`,
  },
  {
    name: 'When i18n is not imported yet, the rule should add it.',
    filename: '/x-pack/solutions/observability/plugins/observability/public/test_component.ts',
    code: `
function TestComponent() {
  const foo = i18n.translate();
}`,
    errors: [
      {
        line: 3,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import { i18n } from '@kbn/i18n';
function TestComponent() {
  const foo = i18n.translate('xpack.observability.testComponent.', { defaultMessage: '' });
}`,
  },
  {
    name: 'When a file is not in a known package or the package has no i18n identifier, it should report an error',
    filename: '/some/fake/path/that/does/not/exist/test_component.ts',
    code: `
import { i18n } from '@kbn/i18n';

function TestComponent() {
  const foo = i18n.translate('some.id', { defaultMessage: 'test' });
}`,
    errors: [
      {
        line: 5,
        message: NO_IDENTIFIER_MESSAGE.replace('APP_ID', 'Unknown package'),
      },
    ],
  },
];

const valid: RuleTester.ValidTestCase[] = [
  {
    name: invalid[0].name,
    filename: invalid[0].filename,
    code: invalid[0].output as string,
  },
  {
    name: invalid[1].name,
    filename: invalid[1].filename,
    code: invalid[1].output as string,
  },
  {
    name: 'When a ternary is passed to i18n.translate, and the root of the i18n identifier is correct, and the branches are valid strings starting with the correct prefix, it should not mark the code as incorrect',
    filename: '/x-pack/solutions/observability/plugins/observability/public/test_component.ts',
    code: `import { i18n } from '@kbn/i18n';

function TestComponent() {
  const isCollapsed = true;
  const foo = i18n.translate(
    isCollapsed
      ? 'xpack.observability.foo.collapsedNodeAriaLabel'
      : 'xpack.observability.foo.expandedNodeAriaLabel',
    {
      defaultMessage: isCollapsed
        ? 'Collapsed node with {childCount} children'
        : 'Expanded node with {childCount} children',
      values: { childCount: item.children.length },
    }
  );
}`,
  },
];

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run(
      '@kbn/i18n_translate_should_start_with_the_right_id',
      I18nTranslateShouldStartWithTheRightId,
      {
        valid,
        invalid,
      }
    );
  });
}
