/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('../oxlint_plugin').rules.scout_require_tags;
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('@kbn/eslint/scout_require_tags', rule, {
  valid: [
    // No describe at all
    { code: `test('works', () => {});` },
    // tags helper
    {
      code: dedent`
        test.describe('suite', { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] }, () => {
          test('works', () => {});
        });
      `,
    },
    // tags.local helper on an apiTest describe
    {
      code: dedent`
        apiTest.describe('suite', { tag: tags.local.stateful.classic }, () => {
          apiTest('works', () => {});
        });
      `,
    },
    // Tag held in a variable
    {
      code: dedent`
        test.describe('suite', { tag: sharedTags }, () => {
          test('works', () => {});
        });
      `,
    },
    // Shared registrar: the describe lives in a helper and is tagged there
    {
      code: dedent`
        export const registerTests = () => {
          apiTest.describe('suite', { tag: tags.deploymentAgnostic }, () => {
            apiTest('works', () => {});
          });
        };
      `,
    },
    // Describe modifiers are checked too
    {
      code: dedent`
        test.describe.skip('suite', { tag: tags.stateful.classic }, () => {});
      `,
    },
    // Nested describes inherit the root tag
    {
      code: dedent`
        test.describe('suite', { tag: tags.stateful.classic }, () => {
          test.describe('nested', () => {
            test('works', () => {});
          });
        });
      `,
    },
    // Untagged describe whose tests are tagged individually
    {
      code: dedent`
        test.describe('suite', () => {
          test('a', { tag: tags.stateful.classic }, () => {});
          test('b', { tag: tags.serverless.observability.complete }, () => {});
        });
      `,
    },
    // Tagged nested suites cover their tests
    {
      code: dedent`
        test.describe('suite', () => {
          test.describe('tagged', { tag: tags.stateful.classic }, () => {
            test('a', () => {});
            test('b', () => {});
          });
          test('c', { tag: tags.serverless.observability.complete }, () => {});
        });
      `,
    },
    // A spread may provide the tag
    {
      code: dedent`
        test.describe('suite', { ...baseOptions }, () => {});
      `,
    },
  ],
  invalid: [
    {
      code: dedent`
        test.describe('suite', () => {
          test('works', () => {});
        });
      `,
      errors: [{ messageId: 'missingTag' }],
    },
    {
      code: dedent`
        apiTest.describe('suite', { timeout: 1000 }, () => {});
      `,
      errors: [{ messageId: 'missingTag' }],
    },
    {
      code: dedent`
        test.describe.skip('suite', () => {});
      `,
      errors: [{ messageId: 'missingTag' }],
    },
    {
      code: dedent`
        test.describe('suite', { tag: [] }, () => {});
      `,
      errors: [{ messageId: 'emptyTag' }],
    },
    // Tags on tests of a *different* describe do not count
    {
      code: dedent`
        test.describe('first', () => {
          test('a', () => {});
        });
        test.describe('second', { tag: tags.stateful.classic }, () => {
          test('b', { tag: tags.stateful.classic }, () => {});
        });
      `,
      errors: [{ messageId: 'missingTag' }],
    },
    // Only the root describe is reported
    {
      code: dedent`
        test.describe('suite', () => {
          test.describe('nested', () => {});
        });
      `,
      errors: [{ messageId: 'missingTag' }],
    },
    // One tagged descendant does not cover an untagged sibling test
    {
      code: dedent`
        test.describe('suite', () => {
          test.describe('tagged', { tag: tags.stateful.classic }, () => {
            test('a', () => {});
          });
          test('b', () => {});
        });
      `,
      errors: [{ messageId: 'missingTag' }],
    },
    // Objects in test bodies do not tag the test declaration
    {
      code: dedent`
        test.describe('suite', () => {
          test('works', () => {
            expect(response).toMatchObject({ tag: 'example' });
          });
        });
      `,
      errors: [{ messageId: 'missingTag' }],
    },
  ],
});
