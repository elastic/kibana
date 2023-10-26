/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleTester } from 'eslint';
import { StringsShouldBeTranslatedWithI18n } from './strings_should_be_translated_with_i18n';

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

const valid = [
  {
    filename: 'x-pack/plugins/observability/public/test_component.tsx',
    code: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function TestComponent() {
      return (
          <div>{i18n.translate('app_not_found_in_i18nrc.testComponent.div.thisIsATestLabel', { defaultMessage: 'This is a test'})}</div>
      )
  }`,
  },
  {
    filename: 'x-pack/plugins/observability/public/another_component.tsx',
    code: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function AnotherComponent() {
        return (
            <EuiPanel>
                <EuiFlexGroup>
                    <EuiFlexItem>
                        <EuiButton>{i18n.translate('app_not_found_in_i18nrc.anotherComponent.thisIsATestButtonLabel', { defaultMessage: 'This is a test'})}</EuiButton>
                    </EuiFlexItem>
                </EuiFlexGroup>
            </EuiPanel>
        )
    }`,
  },
  {
    filename: 'x-pack/plugins/observability/public/yet_another_component.tsx',
    code: `
  import React from 'react';
import { i18n } from '@kbn/i18n';

  function YetAnotherComponent() {
        return (
            <div>
                <EuiSelect>{i18n.translate('app_not_found_in_i18nrc.yetAnotherComponent.selectMeSelectLabel', { defaultMessage: 'Select me'})}</EuiSelect>
            </div>
        )
    }`,
  },
  {
    filename: 'x-pack/plugins/observability/public/test_component.tsx',
    code: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function TestComponent() {
      return (
          <SomeChildComponent label={i18n.translate('app_not_found_in_i18nrc.testComponent.someChildComponent.thisIsATestLabel', { defaultMessage: 'This is a test'})} />
      )
  }`,
  },
];

const invalid = [
  {
    filename: valid[0].filename,
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
        message: `Strings should be translated with i18n. Use the autofix suggestion or add your own.`,
      },
    ],
    output: valid[0].code,
  },
  {
    filename: valid[1].filename,
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
        message: `Strings should be translated with i18n. Use the autofix suggestion or add your own.`,
      },
    ],
    output: valid[1].code,
  },
  {
    filename: valid[2].filename,
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
        message: `Strings should be translated with i18n. Use the autofix suggestion or add your own.`,
      },
    ],
    output: valid[2].code,
  },
  {
    filename: valid[3].filename,
    code: `
import React from 'react';
import { i18n } from '@kbn/i18n';

function TestComponent() {
      return (
          <SomeChildComponent label="This is a test" />
      )
  }`,
    errors: [
      {
        line: 7,
        message: `Strings should be translated with i18n. Use the autofix suggestion or add your own.`,
      },
    ],
    output: valid[3].code,
  },
];

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run(
      '@kbn/event_generating_elements_should_be_instrumented',
      StringsShouldBeTranslatedWithI18n,
      {
        valid,
        invalid,
      }
    );
  });
}
