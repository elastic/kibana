/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_api_test_discourage_kbn_client');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

ruleTester.run('@kbn/eslint/scout_api_test_discourage_kbn_client', rule, {
  valid: [
    // No kbnClient present
    {
      code: dedent`
        apiTest('no kbnClient', async ({ apiClient }) => {
          await apiClient.get('/foo');
        });
      `,
    },
    // beforeAll usage without kbnClient
    {
      code: dedent`
        apiTest.beforeAll(async () => {});
      `,
    },
    // beforeAll usage with kbnClient
    {
      code: dedent`
        apiTest.beforeAll(async ({ kbnClient }) => {});
      `,
    },
    // kbnClient referenced in outer scope but not in apiTest
    {
      code: dedent`
        function helper(kbnClient) { kbnClient.doSomething(); }
        apiTest('not using kbnClient', async ({ apiClient }) => { await apiClient.get('/'); });
      `,
    },
    // eslint-disable for this rule
    {
      code: dedent`
        // eslint-disable-next-line @kbn/eslint/scout_api_test_discourage_kbn_client
        apiTest('override', ({ kbnClient }) => { kbnClient.doSomething(); });
      `,
    },
  ],

  invalid: [
    // direct destructured kbnClient usage
    {
      code: dedent`
        apiTest('uses kbnClient', async ({ kbnClient }) => {
          await kbnClient.call('/x');
        });
      `,
      errors: [{ message: 'API tests must not use the kbnClient fixture.' }],
    },
    // aliasing kbnClient to variable
    {
      code: dedent`
        apiTest('alias kbnClient', async ({ kbnClient }) => {
          const client = kbnClient;
          client.doSomething();
        });
      `,
      errors: [{ message: 'API tests must not use the kbnClient fixture.' }],
    },
    // passing kbnClient to helper that uses it
    {
      code: dedent`
        function external(client) { client.doSomething(); }
        apiTest('pass to external', async ({ kbnClient }) => {
          external(kbnClient);
        });
      `,
      errors: [{ message: 'API tests must not use the kbnClient fixture.' }],
    },
    // member expression inside nested block
    {
      code: dedent`
        apiTest('nested member', ({ kbnClient }) => {
          if (true) {
            kbnClient.doSomething();
          }
        });
      `,
      errors: [{ message: 'API tests must not use the kbnClient fixture.' }],
    },
  ],
});
