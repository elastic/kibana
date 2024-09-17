/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./no_deprecated_authz_config');

// Indentation is a big problem in the test cases, dedent library does not work as expected

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

ruleTester.run('no_deprecated_authz_config', rule, {
  valid: [
    {
      code: `
        router.get({
          path: '/some/path',
          options: {
            tags: ['otherTag'],
          },
          security: {
            authz: {
              requiredPrivileges: ['somePrivilege'],
            },
          },
        });
      `,
      options: [],
    },
    {
      code: `
        router.versioned
          .get({
            path: '/some/path',
            options: {
              tags: ['otherTag'],
            },
          })
          .addVersion(
            {
              version: '1',
              validate: false,
              security: {
                authz: {
                  requiredPrivileges: ['managePrivileges'],
                },
              },
            },
            () => {}
          );
      `,
      options: [],
    },
  ],

  invalid: [
    {
      code: `
        router.get({
          path: '/some/path',
          options: {
            tags: ['access:securitySolution'],
          },
        });
      `,
      errors: [{ message: "Move 'access' tags to security.authz.requiredPrivileges." }],
      output: `
        router.get({
          path: '/some/path',
          security: {
                authz: {
                  requiredPrivileges: ['securitySolution'],
                },
              },
        });
      `,
    },
    {
      code: `
        router.get({
          path: '/some/path',
          options: {
            tags: [\`access:\${APP_ID}-entity-analytics\`],
          },
        });
      `,
      errors: [{ message: "Move 'access' tags to security.authz.requiredPrivileges." }],
      output: `
        router.get({
          path: '/some/path',
          security: {
                authz: {
                  requiredPrivileges: [\`\${APP_ID}-entity-analytics\`],
                },
              },
        });
      `,
    },
    {
      code: `
        router.get({
          path: '/some/path',
          options: {
            tags: ['access:securitySolution', 'otherTag'],
          },
        });
      `,
      errors: [{ message: "Move 'access' tags to security.authz.requiredPrivileges." }],
      output: `
        router.get({
          path: '/some/path',
          security: {
                authz: {
                  requiredPrivileges: ['securitySolution'],
                },
              },options: {
            tags: ['otherTag'],
          },
        });
      `,
    },
    {
      code: `
        router.versioned
          .get({
            path: '/some/path',
            options: {
              tags: ['access:securitySolution'],
            },
          })
          .addVersion(
            {
              version: '1',
              validate: false,
              security: {
                authz: {
                  requiredPrivileges: [ApiActionPermission.ManageSpaces],
                },
              },
            },
            () => {}
          );
      `,
      errors: [{ message: "Move 'access' tags to security.authz.requiredPrivileges." }],
      output: `
        router.versioned
          .get({
            path: '/some/path',
            security: {
                authz: {
                  requiredPrivileges: ['securitySolution'],
                },
              },
          })
          .addVersion(
            {
              version: '1',
              validate: false,
              security: {
                authz: {
                  requiredPrivileges: [ApiActionPermission.ManageSpaces],
                },
              },
            },
            () => {}
          );
      `,
    },
    {
      code: `
        router.get({
          path: '/some/path',
          options: {
            tags: ['access:securitySolution', \`access:\${APP_ID}-entity-analytics\`],
          },
        });
      `,
      errors: [{ message: "Move 'access' tags to security.authz.requiredPrivileges." }],
      output: `
        router.get({
          path: '/some/path',
          security: {
                authz: {
                  requiredPrivileges: ['securitySolution', \`\${APP_ID}-entity-analytics\`],
                },
              },
        });
      `,
    },
  ],
});
