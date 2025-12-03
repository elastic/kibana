/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_api_test_encourage_api_client');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

ruleTester.run('@kbn/eslint/scout_api_test_encourage_api_client', rule, {
  valid: [
    // Top-level apiClient usage
    {
      code: dedent`
        apiTest('top-level usage', async ({ apiClient, other }) => {
          await apiClient.get('/foo');
        });
      `,
    },
    // Nested apiTest.describe
    {
      code: dedent`
        apiTest.describe('suite', () => {
          apiTest('inner test', async ({ apiClient }) => {
            await apiClient.post('/bar');
          });
        });
      `,
    },
    // apiClient not used in beforeAll
    {
      code: dedent`
        apiTest.beforeAll(async () => {
        });
      `,
    },
    // Nested blocks
    {
      code: dedent`
        apiTest('nested block', async ({ apiClient }) => {
          if (true) {
            apiClient.get('/nested');
          }
        });
      `,
    },
    // Nested helper function
    {
      code: dedent`
        apiTest('nested helper', async ({ apiClient }) => {
          function helper() {
            apiClient.get('/helper');
          }
          helper();
        });
      `,
    },
    // External helper called inside test
    {
      code: dedent`
      function externalHelper(apiClient) {
      }
      apiTest('external helper', async ({ apiClient }) => {
        externalHelper(apiClient);
      });
    `,
    },
    // Arrow function inside test
    {
      code: dedent`
      apiTest('inline arrow helper', async ({ apiClient }) => {
        const callApi = () => apiClient.get('/bar');
        callApi();
      });
    `,
    },
    // Override with eslint-disable comment
    {
      code: dedent`
      // eslint-disable-next-line @kbn/eslint/scout_api_test_encourage_api_client
      apiTest('override', () => {
        console.log('no apiClient here');
      });
    `,
    },
    // Destructured apiClient with alias
    {
      code: dedent`
    apiTest('destructured alias', async ({ apiClient: client }) => {
      await client.get('/alias');
    });
  `,
    },
    // Assigned apiClient to a variable
    {
      code: dedent`
    apiTest('variable alias', async ({ apiClient }) => {
      const client = apiClient;
      await client.get('/variable');
    });
  `,
    },
    // Deep nested: function that returns a function
    {
      code: dedent`
    function external() {
      function inner(apiClient) {
        apiClient.get('/deep');
      }
      return inner;
    }
    apiTest('deep call chain', async ({ apiClient }) => {
      const fn = external();
      fn(apiClient);
    });
  `,
    },
  ],

  invalid: [
    // Destructured param but not used
    {
      code: dedent`
        apiTest('destructured unused', async ({ apiClient, other }) => {
          console.log(other);
        });
      `,
      errors: [{ message: 'API tests must use the apiClient fixture.' }],
    },
    // Nested apiTest inside apiTest.describe missing apiClient
    {
      code: dedent`
        apiTest.describe('suite', () => {
          apiTest('inner missing', () => {});
        });
      `,
      errors: [{ message: 'API tests must use the apiClient fixture.' }],
    },
    // Nested blocks missing apiClient
    {
      code: dedent`
        apiTest('nested block missing', () => {
          if (true) {
            console.log('no apiClient');
          }
        });
      `,
      errors: [{ message: 'API tests must use the apiClient fixture.' }],
    },
    // Nested helper function missing apiClient
    {
      code: dedent`
        apiTest('nested helper missing', () => {
          function helper() {
            console.log('no apiClient here');
          }
          helper();
        });
      `,
      errors: [{ message: 'API tests must use the apiClient fixture.' }],
    },
    // External helper without apiClient usage
    {
      code: dedent`
      function externalHelper() {
        console.log('no apiClient');
      }
      apiTest('external helper missing', () => {
        externalHelper();
      });
    `,
      errors: [{ message: 'API tests must use the apiClient fixture.' }],
    },
    // Passing apiClient to a variable but never using it
    {
      code: dedent`
      apiTest('unused apiClient', async ({ apiClient }) => {
        const fn = (client) => {};
        fn(apiClient);
      });
    `,
      errors: [{ message: 'API tests must use the apiClient fixture.' }],
    },
  ],
});
