/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_require_api_client_in_api_test');
const dedent = require('dedent');

const DEFAULT_ERROR_MSG =
  'The `apiClient` fixture should be used in `apiTest` to call an endpoint and later verify response code and body.';
const ALT_ERROR_MSG =
  'One of `apiClient` or `esClient` fixtures should be used in `apiTest` to interact with an endpoint and later verify the response.';
const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

ruleTester.run('@kbn/eslint/scout_require_api_client_in_api_test', rule, {
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
      // eslint-disable-next-line @kbn/eslint/scout_require_api_client_in_api_test
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
    // UI test
    {
      code: dedent`
    test.describe('Painless Lab', { tag: tags.stateful.all }, () => {
      test.beforeEach(async ({ browserAuth, pageObjects }) => {
      });
      test('validate painless lab editor and request', async ({ pageObjects }) => {
      });
    });
      `,
    },
    // Parallel test
    {
      code: dedent`
    spaceTest.describe('Painless Lab', { tag: tags.stateful.all }, () => {
      spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      });
      spaceTest('validate painless lab editor and request', async ({ pageObjects }) => {
      });
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
      errors: [{ message: DEFAULT_ERROR_MSG }],
    },
    // Nested apiTest inside apiTest.describe missing apiClient
    {
      code: dedent`
        apiTest.describe('suite', () => {
          apiTest('inner missing', () => {});
        });
      `,
      errors: [{ message: DEFAULT_ERROR_MSG }],
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
      errors: [{ message: DEFAULT_ERROR_MSG }],
    },
    // Nested helper function missing apiClient
    {
      code: dedent`
        apiTest('nested helper missing', ({ apiClient }) => {
          function helper(client) {
            console.log('no apiClient here');
          }
          helper(apiClient);
        });
      `,
      errors: [{ message: DEFAULT_ERROR_MSG }],
    },
    // Arrow function inside test
    {
      code: dedent`
      apiTest('inline arrow helper', async ({ apiClient }) => {
        const callApi = () => apiClient.get('/bar');
      });
    `,
      errors: [{ message: DEFAULT_ERROR_MSG }],
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
      errors: [{ message: DEFAULT_ERROR_MSG }],
    },
    // Passing apiClient to a variable but never using it
    {
      code: dedent`
      apiTest('unused apiClient', async ({ apiClient }) => {
        const fn = (client) => {};
        fn(apiClient);
      });
    `,
      errors: [{ message: DEFAULT_ERROR_MSG }],
    },
  ],
});

// --- Tests with alternativeFixtures option ---
const altOptions = [{ alternativeFixtures: ['esClient'] }];

ruleTester.run(
  '@kbn/eslint/scout_require_api_client_in_api_test (with alternativeFixtures)',
  rule,
  {
    valid: [
      // apiClient still accepted when alternativeFixtures is configured
      {
        code: dedent`
        apiTest('uses apiClient', async ({ apiClient }) => {
          await apiClient.get('/foo');
        });
      `,
        options: altOptions,
      },
      // Alternative fixture used instead of apiClient
      {
        code: dedent`
        apiTest('uses esClient', async ({ esClient }) => {
          await esClient.load('path/to/archive');
        });
      `,
        options: altOptions,
      },
    ],

    invalid: [
      // Neither apiClient nor alternative fixture used
      {
        code: dedent`
        apiTest('uses neither', async () => {
          console.log('no fixture');
        });
      `,
        options: altOptions,
        errors: [{ message: ALT_ERROR_MSG }],
      },
    ],
  }
);
