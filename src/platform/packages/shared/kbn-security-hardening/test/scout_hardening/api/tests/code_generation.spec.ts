/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

apiTest.describe(
  'code generation from strings is disallowed',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKey('viewer');
    });

    apiTest('eval is blocked on the server', async ({ apiClient }) => {
      const response = await apiClient.get('/internal/hardening/_try_code_generation', {
        headers: {
          ...credentials.apiKeyHeader,
          'x-elastic-internal-origin': 'kibana',
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.eval.blocked).toBe(true);
      expect(response.body.eval.error).toContain(
        'Code generation from strings disallowed for this context'
      );
    });

    apiTest('Function constructor is blocked on the server', async ({ apiClient }) => {
      const response = await apiClient.get('/internal/hardening/_try_code_generation', {
        headers: {
          ...credentials.apiKeyHeader,
          'x-elastic-internal-origin': 'kibana',
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.functionConstructor.blocked).toBe(true);
      expect(response.body.functionConstructor.error).toContain(
        'Code generation from strings disallowed for this context'
      );
    });
  }
);
