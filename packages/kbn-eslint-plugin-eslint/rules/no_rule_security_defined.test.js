/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');

const rule = require('./no_route_security_defined');

// Tests
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
ruleTester.run('append-security-object', rule, {
  valid: [
    {
      code: `
      router.get(
        {
          path: '/api/security/authz_poc/simple_privileges_example_1',
          security: {
            authz: {
              enabled: false,
              reason: 'This route is opted out from authorization ',
            },
          },
          validate: false,
        },
        createLicensedRouteHandler(async (context, request, response) => {
          try {
            return response.ok({
              body: {
                authzResult: request.authzResult,
              },
            });
          } catch (error) {
            return response.customError(wrapIntoCustomErrorResponse(error));
          }
        })
      );
      `,
    },
  ],
  invalid: [
    {
      code: `
      router.get(
        {
          path: '/api/security/authz_poc/simple_privileges_example_1',
          validate: false,
        },
        createLicensedRouteHandler(async (context, request, response) => {
          try {
            return response.ok({
              body: {
                authzResult: request.authzResult,
              },
            });
          } catch (error) {
            return response.customError(wrapIntoCustomErrorResponse(error));
          }
        })
      );
      `,
      errors: [{ message: 'Security object is missing' }],
      output: `
      router.get(
        {
          path: '/api/security/authz_poc/simple_privileges_example_1',
          security: {
            authz: {
              enabled: false,
              reason: 'This route is opted out from authorization',
            },
          },
          validate: false,
        },
        createLicensedRouteHandler(async (context, request, response) => {
          try {
            return response.ok({
              body: {
                authzResult: request.authzResult,
              },
            });
          } catch (error) {
            return response.customError(wrapIntoCustomErrorResponse(error));
          }
        })
      );
      `,
    },
  ],
});
