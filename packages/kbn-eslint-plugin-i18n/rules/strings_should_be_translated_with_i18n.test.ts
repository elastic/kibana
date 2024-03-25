/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleTester } from 'eslint';
import {
  StringsShouldBeTranslatedWithI18n,
  RULE_WARNING_MESSAGE,
} from './strings_should_be_translated_with_i18n';

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
    name: 'A JSX element with a string literal should be translated with i18n',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
import React from 'react';

function TestComponent() {
  return (
    <div>This is a test</div>
  )
}`,
    errors: [
      {
        line: 6,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function TestComponent() {
  return (
    <div>{i18n.translate('xpack.observability.testComponent.div.thisIsATestLabel', { defaultMessage: 'This is a test' })}</div>
  )
}`,
  },
  {
    name: 'A JSX element with a string literal that are inside an Eui component should take the component name of the parent into account',
    filename: '/x-pack/plugins/observability_solution/observability/public/another_component.tsx',
    code: `
import React from 'react';

function AnotherComponent() {
  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton>This is a test</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  )
}`,
    errors: [
      {
        line: 9,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function AnotherComponent() {
  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton>{i18n.translate('xpack.observability.anotherComponent.thisIsATestButtonLabel', { defaultMessage: 'This is a test' })}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  )
}`,
  },
  {
    name: 'When no import of the translation module is present, the import line should be added',
    filename:
      '/x-pack/plugins/observability_solution/observability/public/yet_another_component.tsx',
    code: `
import React from 'react';

function YetAnotherComponent() {
  return (
    <div>
      <EuiSelect>Select me</EuiSelect>
    </div>
  )
}`,
    errors: [
      {
        line: 7,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function YetAnotherComponent() {
  return (
    <div>
      <EuiSelect>{i18n.translate('xpack.observability.yetAnotherComponent.selectMeSelectLabel', { defaultMessage: 'Select me' })}</EuiSelect>
    </div>
  )
}`,
  },
  {
    name: 'Import lines without the necessary translation module should be updated to include i18n',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
import React from 'react';
import { SomeOtherModule } from '@kbn/i18n';

function TestComponent() {
  return (
    <SomeChildComponent label="This is a test" />
  )
}`,
    errors: [
      {
        line: 7,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import React from 'react';
import { SomeOtherModule, i18n } from '@kbn/i18n';

function TestComponent() {
  return (
    <SomeChildComponent label={i18n.translate('xpack.observability.testComponent.someChildComponent.thisIsATestLabel', { defaultMessage: 'This is a test' })} />
  )
}`,
  },
  {
    name: 'JSX elements that have a label, aria-label or title prop with a string value should be translated with i18n',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function TestComponent() {
  return (
    <SomeChildComponent label="This is a test" />
  )
}
function TestComponent2() {
  return (
    <SomeChildComponent aria-label="This is a test" />
  )
}
function TestComponent3() {
  return (
    <SomeChildComponent title="This is a test" />
  )
}`,
    errors: [
      {
        line: 7,
        message: RULE_WARNING_MESSAGE,
      },
      {
        line: 12,
        message: RULE_WARNING_MESSAGE,
      },
      {
        line: 17,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function TestComponent() {
  return (
    <SomeChildComponent label={i18n.translate('xpack.observability.testComponent.someChildComponent.thisIsATestLabel', { defaultMessage: 'This is a test' })} />
  )
}
function TestComponent2() {
  return (
    <SomeChildComponent aria-label={i18n.translate('xpack.observability.testComponent2.someChildComponent.thisIsATestLabel', { defaultMessage: 'This is a test' })} />
  )
}
function TestComponent3() {
  return (
    <SomeChildComponent title={i18n.translate('xpack.observability.testComponent3.someChildComponent.thisIsATestLabel', { defaultMessage: 'This is a test' })} />
  )
}`,
  },
  {
    name: 'JSX elements that have a label, aria-label or title prop with a JSXExpression value that is a string should be translated with i18n',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function TestComponent() {
  return (
    <SomeChildComponent label={'This is a test'} />
  )
}
function TestComponent2() {
  return (
    <SomeChildComponent aria-label={'This is a test'} />
  )
}
function TestComponent3() {
  return (
    <SomeChildComponent title={'This is a test'} />
  )
}`,
    errors: [
      {
        line: 7,
        message: RULE_WARNING_MESSAGE,
      },
      {
        line: 12,
        message: RULE_WARNING_MESSAGE,
      },
      {
        line: 17,
        message: RULE_WARNING_MESSAGE,
      },
    ],
    output: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function TestComponent() {
  return (
    <SomeChildComponent label={i18n.translate('xpack.observability.testComponent.someChildComponent.thisIsATestLabel', { defaultMessage: 'This is a test' })} />
  )
}
function TestComponent2() {
  return (
    <SomeChildComponent aria-label={i18n.translate('xpack.observability.testComponent2.someChildComponent.thisIsATestLabel', { defaultMessage: 'This is a test' })} />
  )
}
function TestComponent3() {
  return (
    <SomeChildComponent title={i18n.translate('xpack.observability.testComponent3.someChildComponent.thisIsATestLabel', { defaultMessage: 'This is a test' })} />
  )
}`,
  },
];

const valid: RuleTester.ValidTestCase[] = [
  {
    name: 'A JSXText element inside a EuiCode component should not be translated',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
import React from 'react';

function TestComponent() {
  return (
    <EuiCode>This is a test</EuiCode>
  )
}`,
  },
  {
    name: 'A JSXText element that contains anything other than alpha characters should not be translated',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
import React from 'react';

function TestComponent() {
  return (
    <div>!@#$%^&*()_+{}123 456 789</div>
  )
}`,
  },
  {
    name: 'A JSXText element that is wrapped in three backticks (markdown) should not be translated',
    filename: '/x-pack/plugins/observability_solution/observability/public/test_component.tsx',
    code: `
import React from 'react';

function TestComponent() {
  return (
    <div>\`\`\`hello\`\`\`</div>
  )
}`,
  },
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
    name: invalid[2].name,
    filename: invalid[2].filename,
    code: invalid[2].output as string,
  },
  {
    name: invalid[3].name,
    filename: invalid[3].filename,
    code: invalid[3].output as string,
  },
  {
    name: invalid[4].name,
    filename: invalid[4].filename,
    code: invalid[4].output as string,
  },
  {
    name: invalid[5].name,
    filename: invalid[5].filename,
    code: invalid[5].output as string,
  },
];

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run('@kbn/strings_should_be_translated_with_i18n', StringsShouldBeTranslatedWithI18n, {
      valid,
      invalid,
    });
  });
}
