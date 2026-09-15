/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_prefer_both_arch_tags');
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

ruleTester.run('@kbn/eslint/scout_prefer_both_arch_tags', rule, {
  valid: [
    // No tag at all — not our concern
    {
      code: dedent`
        test.describe('my suite', () => {
          test('works', () => {});
        });
      `,
    },
    // Both archs via spread
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('my suite', { tag: [...tags.stateful.classic, ...tags.serverless.search] }, () => {
          test('works', () => {});
        });
      `,
    },
    // Both archs — stateful + serverless observability
    {
      code: dedent`
        import { tags } from '@kbn/scout-oblt';
        test.describe('Service inventory', { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] }, () => {
          test('works', () => {});
        });
      `,
    },
    // deploymentAgnostic covers both
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('my suite', { tag: tags.deploymentAgnostic }, () => {
          test('works', () => {});
        });
      `,
    },
    // deploymentAgnostic spread with extra serverless
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('my suite', { tag: [...tags.deploymentAgnostic, ...tags.serverless.observability.logs_essentials] }, () => {
          test('works', () => {});
        });
      `,
    },
    // Performance-only — no arch requirement
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('perf suite', { tag: tags.performance }, () => {
          test('works', () => {});
        });
      `,
    },
    // String literals covering both archs
    {
      code: dedent`
        test.describe('my suite', { tag: ['@local-stateful-classic', '@local-serverless-search'] }, () => {
          test('works', () => {});
        });
      `,
    },
    // Unknown variable alone — conservative, no warning
    {
      code: dedent`
        test.describe('my suite', { tag: myCustomTags }, () => {
          test('works', () => {});
        });
      `,
    },
    // Unknown variable spread alongside a known arch — could provide the missing arch, suppress
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('my suite', { tag: [...tags.stateful.classic, ...sharedTags] }, () => {
          test('works', () => {});
        });
      `,
    },
    // Non-tags MemberExpression — unresolvable, suppress
    {
      code: dedent`
        test.describe('my suite', { tag: [...tags.stateful.classic, ...config.extraTags] }, () => {
          test('works', () => {});
        });
      `,
    },
    // Computed property access on tags (e.g. tags[architecture]) — unresolvable, suppress
    {
      code: dedent`
        test.describe('my suite', { tag: [...tags.stateful.classic, ...tags[architecture]] }, () => {
          test('works', () => {});
        });
      `,
    },
    // Spread after tag property can override it — suppress conservatively
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('my suite', { tag: tags.stateful.classic, ...sharedOptions }, () => {
          test('works', () => {});
        });
      `,
    },
    // apiTest.describe with both archs
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        apiTest.describe('API suite', { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] }, () => {
          apiTest('works', () => {});
        });
      `,
    },
    // spaceTest.describe with both archs
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        spaceTest.describe('space suite', { tag: [...tags.stateful.classic, ...tags.serverless.search] }, () => {
          spaceTest('works', () => {});
        });
      `,
    },
  ],

  invalid: [
    // Stateful only via MemberExpression
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('my suite', { tag: tags.stateful.classic }, () => {
          test('works', () => {});
        });
      `,
      errors: [{ messageId: 'statefulOnly' }],
    },
    // Stateful only via array spread
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('my suite', { tag: [...tags.stateful.classic] }, () => {
          test('works', () => {});
        });
      `,
      errors: [{ messageId: 'statefulOnly' }],
    },
    // Stateful + perf — perf doesn't count as an arch
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('my suite', { tag: [...tags.stateful.classic, ...tags.performance] }, () => {
          test('works', () => {});
        });
      `,
      errors: [{ messageId: 'statefulOnly' }],
    },
    // Serverless only via MemberExpression
    {
      code: dedent`
        import { tags } from '@kbn/scout-oblt';
        test.describe('my suite', { tag: tags.serverless.observability.complete }, () => {
          test('works', () => {});
        });
      `,
      errors: [{ messageId: 'serverlessOnly' }],
    },
    // Serverless only via spread
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('my suite', { tag: [...tags.serverless.search] }, () => {
          test('works', () => {});
        });
      `,
      errors: [{ messageId: 'serverlessOnly' }],
    },
    // Serverless all — still only serverless
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        test.describe('my suite', { tag: tags.serverless.all }, () => {
          test('works', () => {});
        });
      `,
      errors: [{ messageId: 'serverlessOnly' }],
    },
    // String literal — stateful only
    {
      code: dedent`
        test.describe('my suite', { tag: '@local-stateful-classic' }, () => {
          test('works', () => {});
        });
      `,
      errors: [{ messageId: 'statefulOnly' }],
    },
    // String literal array — serverless only
    {
      code: dedent`
        test.describe('my suite', { tag: ['@local-serverless-search', '@cloud-serverless-search'] }, () => {
          test('works', () => {});
        });
      `,
      errors: [{ messageId: 'serverlessOnly' }],
    },
    // apiTest.describe — stateful only
    {
      code: dedent`
        import { tags } from '@kbn/scout';
        apiTest.describe('API suite', { tag: tags.stateful.classic }, () => {
          apiTest('works', () => {});
        });
      `,
      errors: [{ messageId: 'statefulOnly' }],
    },
  ],
});
