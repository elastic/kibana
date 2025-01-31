/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
const { RuleTester } = require('eslint');
const rule = require('./require_kibana_feature_privileges_naming');

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

ruleTester.run('@kbn/require_kibana_feature_privileges_naming', rule, {
  valid: [
    {
      code: `
        const privilege = "manage_users";
        plugins.features.registerKibanaFeature({
          privileges: {
            all: {
              api: [privilege, "create_logs", "read_logs"],
            },
          },
        });
      `,
    },
    {
      code: `
        plugins.features.registerKibanaFeature({
          privileges: {
            all: {
              api: ["manage_logs", "create_entries"],
            },
          },
        });
      `,
    },
    {
      code: `
        features.registerKibanaFeature({
          privileges: {
            all: {
              api: ["read_entries", "update_entries"],
            },
          },
        });
      `,
    },
    {
      code: `
        const validPrivilege = "delete_users";
        const anotherValidPrivilege = "manage_permissions";
        plugins.features.registerKibanaFeature({
          privileges: {
            all: {
              api: [validPrivilege, anotherValidPrivilege],
            },
          },
        });
      `,
    },
  ],
  invalid: [
    {
      code: `
        plugins.features.registerKibanaFeature({
          privileges: {
            all: {
              api: ["incorrect_value", "manage_logs"],
            },
          },
        });
      `,
      errors: [
        {
          message: `API privilege 'incorrect_value' should start with [manage|create|update|delete|read] or use ApiPrivileges.manage instead`,
        },
      ],
    },
    {
      code: `
        features.registerKibanaFeature({
          privileges: {
            all: {
              api: ["entry_read", "create_logs"],
            },
          },
        });
      `,
      errors: [
        {
          message: `API privilege 'entry_read' should start with [manage|create|update|delete|read] or use ApiPrivileges.read instead`,
        },
      ],
    },
    {
      code: `
        features.registerKibanaFeature({
          privileges: {
            all: {
              api: ["read_entry-log", "create_logs"],
            },
          },
        });
      `,
      errors: [
        {
          message: `API privilege 'read_entry-log' should use '_' as a separator`,
        },
      ],
    },
    {
      code: `
        const privilege = 'users-manage';
        plugins.features.registerKibanaFeature({
          privileges: {
            all: {
              api: [privilege, "create_logs", "read_logs"],
            },
          },
        });
      `,
      errors: [
        {
          message: `API privilege 'users-manage' should start with [manage|create|update|delete|read] or use ApiPrivileges.manage instead`,
        },
      ],
    },
  ],
});
