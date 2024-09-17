/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./no_deprecated_authz_config');
const dedent = require('dedent');

// Indentation is a big problem in the test cases, dedent library does not work as expected.

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

ruleTester.run('no_deprecated_authz_config', rule, {
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
        () => {}
      );
      `,
      name: 'valid: security config is present and authz is disabled',
    },
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
      name: 'valid: security config is present and authz is enabled',
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
      name: 'valid: security config is present for versioned route',
    },
    {
      code: `
        router.versioned
          .get({
            path: '/some/path',
            options: {
              tags: ['otherTag'],
            },
            security: {
              authz: {
                requiredPrivileges: ['managePrivileges'],
              },
            },
          })
          .addVersion(
            {
              version: '1',
              validate: false,
            },
            () => {}
          );
      `,
      name: 'valid: security config is present for versioned route provided in root route definition',
    },
  ],

  invalid: [
    {
      code: dedent(`
        router.get(
          {
            path: '/test/path',
            validate: false,
          },
          () => {}
        );
        `),
      errors: [{ message: 'Security config is missing' }],
      output: dedent(`
        router.get(
          {
            path: '/test/path',
            security: {
              authz: {
                enabled: false,
                reason: 'This route is opted out from authorization',
              },
            },
            validate: false,
          },
          () => {}
        );
      `),
      name: 'invalid: security config is missing',
    },
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
      name: 'invalid: access tags are string literals, move to security.authz.requiredPrivileges',
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
      name: 'invalid: access tags are template literals, move to security.authz.requiredPrivileges',
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
      name: 'invalid: both access tags and non access tags, move only access tags to security.authz.requiredPrivileges',
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
      name: 'invalid: versioned route root access tags, move access tags to security.authz.requiredPrivileges',
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
      name: 'invalid: string and template literal access tags, move both to security.authz.requiredPrivileges',
    },
    {
      code: dedent(`
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
            },
            () => {}
          );
      `),
      errors: [{ message: 'Security config is missing in addVersion call' }],
      output: dedent(`
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
            security: {
              authz: {
                enabled: false,
                reason: 'This route is opted out from authorization',
              },
            },
              validate: false,
            },
            () => {}
          );
      `),
      name: 'invalid: security config is missing in addVersion call',
    },
    {
      code: dedent(`
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
            },
            () => {}
          )
          .addVersion(
            {
              version: '2',
              validate: false,
            },
            () => {}
          );
      `),
      errors: [
        { message: 'Security config is missing in addVersion call' },
        { message: 'Security config is missing in addVersion call' },
      ],
      output: dedent(`
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
            security: {
              authz: {
                enabled: false,
                reason: 'This route is opted out from authorization',
              },
            },
              validate: false,
            },
            () => {}
          )
          .addVersion(
            {
              version: '2',
            security: {
              authz: {
                enabled: false,
                reason: 'This route is opted out from authorization',
              },
            },
              validate: false,
            },
            () => {}
          );
      `),
      name: 'invalid: security config is missing in multiple addVersion call',
    },
  ],
});
