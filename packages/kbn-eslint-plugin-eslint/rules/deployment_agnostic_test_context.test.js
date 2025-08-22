/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./deployment_agnostic_test_context');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('deployment_agnostic_test_context', rule, {
  valid: [
    // Correct usage in deployment-agnostic apis directory
    {
      filename: 'x-pack/platform/test/api_integration_deployment_agnostic/apis/test.ts',
      code: `
        export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
          const roleScopedSupertest = getService('roleScopedSupertest');
        }
      `,
    },
    // Correct usage in deployment-agnostic services directory
    {
      filename: 'x-pack/platform/test/api_integration_deployment_agnostic/services/test.ts',
      code: `
        export function TestServiceProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
          const esClient = getService('es');
          return { test: () => 'test' };
        }
      `,
    },
    // Correct usage in observability deployment-agnostic apis directory
    {
      filename:
        'x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/test.ts',
      code: `
        export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
          const apmApiClient = getService('apmApi');
          const synthtrace = getService('synthtrace');
        }
      `,
    },
    // Correct usage in observability deployment-agnostic services directory
    {
      filename:
        'x-pack/solutions/observability/test/api_integration_deployment_agnostic/services/test.ts',
      code: `
        export function ObservabilityServiceProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
          const esClient = getService('es');
          return { observability: () => 'test' };
        }
      `,
    },
    // Using other services should be fine in apis
    {
      filename: 'x-pack/platform/test/api_integration_deployment_agnostic/apis/test.ts',
      code: `
        export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
          const esClient = getService('es');
          const config = getService('config');
        }
      `,
    },
    // Using other services should be fine in services
    {
      filename: 'x-pack/platform/test/api_integration_deployment_agnostic/services/test.ts',
      code: `
        export function TestServiceProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
          const supertestWithoutAuth = getService('supertestWithoutAuth');
          const samlAuth = getService('samlAuth');
        }
      `,
    },
  ],
  invalid: [
    // Wrong context provider type in apis
    {
      filename: 'x-pack/platform/test/api_integration_deployment_agnostic/apis/test.ts',
      code: `
        export default function ({ getService }: FtrProviderContext) {
          const esClient = getService('es');
        }
      `,
      errors: [
        {
          messageId: 'deploymentAgnosticContext',
        },
      ],
    },
    // Wrong context provider type in services
    {
      filename: 'x-pack/platform/test/api_integration_deployment_agnostic/services/test.ts',
      code: `
        export function TestServiceProvider({ getService }: FtrProviderContext) {
          const esClient = getService('es');
          return { test: () => 'test' };
        }
      `,
      errors: [
        {
          messageId: 'deploymentAgnosticContext',
        },
      ],
    },
    // Using supertest service in apis
    {
      filename: 'x-pack/platform/test/api_integration_deployment_agnostic/apis/test.ts',
      code: `
        export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
          const supertest = getService('supertest');
        }
      `,
      errors: [
        {
          messageId: 'supertestService',
        },
      ],
    },
    // Using supertest service in services
    {
      filename: 'x-pack/platform/test/api_integration_deployment_agnostic/services/test.ts',
      code: `
        export function TestServiceProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
          const supertest = getService('supertest');
          return { test: () => 'test' };
        }
      `,
      errors: [
        {
          messageId: 'supertestService',
        },
      ],
    },
    // Both violations in apis
    {
      filename: 'x-pack/platform/test/api_integration_deployment_agnostic/apis/test.ts',
      code: `
        export default function ({ getService }: FtrProviderContext) {
          const supertest = getService('supertest');
        }
      `,
      errors: [
        {
          messageId: 'deploymentAgnosticContext',
        },
        {
          messageId: 'supertestService',
        },
      ],
    },
    // Both violations in services
    {
      filename: 'x-pack/platform/test/api_integration_deployment_agnostic/services/test.ts',
      code: `
        export function TestServiceProvider({ getService }: FtrProviderContext) {
          const supertest = getService('supertest');
          return { test: () => 'test' };
        }
      `,
      errors: [
        {
          messageId: 'deploymentAgnosticContext',
        },
        {
          messageId: 'supertestService',
        },
      ],
    },
    // Wrong context provider type in observability apis
    {
      filename:
        'x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/test.ts',
      code: `
        export default function ({ getService }: FtrProviderContext) {
          const apmApiClient = getService('apmApi');
        }
      `,
      errors: [
        {
          messageId: 'deploymentAgnosticContext',
        },
      ],
    },
    // Wrong context provider type in observability services
    {
      filename:
        'x-pack/solutions/observability/test/api_integration_deployment_agnostic/services/test.ts',
      code: `
        export function ObservabilityServiceProvider({ getService }: FtrProviderContext) {
          const esClient = getService('es');
          return { observability: () => 'test' };
        }
      `,
      errors: [
        {
          messageId: 'deploymentAgnosticContext',
        },
      ],
    },
    // Using supertest service in observability apis
    {
      filename:
        'x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/test.ts',
      code: `
        export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
          const supertest = getService('supertest');
        }
      `,
      errors: [
        {
          messageId: 'supertestService',
        },
      ],
    },
    // Using supertest service in observability services
    {
      filename:
        'x-pack/solutions/observability/test/api_integration_deployment_agnostic/services/test.ts',
      code: `
        export function ObservabilityServiceProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
          const supertest = getService('supertest');
          return { observability: () => 'test' };
        }
      `,
      errors: [
        {
          messageId: 'supertestService',
        },
      ],
    },
    // Both violations in observability apis
    {
      filename:
        'x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/test.ts',
      code: `
        export default function ({ getService }: FtrProviderContext) {
          const supertest = getService('supertest');
        }
      `,
      errors: [
        {
          messageId: 'deploymentAgnosticContext',
        },
        {
          messageId: 'supertestService',
        },
      ],
    },
    // Both violations in observability services
    {
      filename:
        'x-pack/solutions/observability/test/api_integration_deployment_agnostic/services/test.ts',
      code: `
        export function ObservabilityServiceProvider({ getService }: FtrProviderContext) {
          const supertest = getService('supertest');
          return { observability: () => 'test' };
        }
      `,
      errors: [
        {
          messageId: 'deploymentAgnosticContext',
        },
        {
          messageId: 'supertestService',
        },
      ],
    },
  ],
});
