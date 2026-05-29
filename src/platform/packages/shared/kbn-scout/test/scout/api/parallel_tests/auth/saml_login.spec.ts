/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags } from '../../../../../src/playwright';
import { expect } from '../../../../../api';

apiTest.describe(
  `SAML Auth fixture`,
  { tag: [...tags.deploymentAgnostic, ...tags.serverless.observability.logs_essentials] },
  () => {
    apiTest(`should create a session for 'admin' role`, async ({ samlAuth }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      expect(credentials.cookieValue).toBeDefined();
    });

    apiTest(`should create API Key for 'admin' role`, async ({ requestAuth }) => {
      const adminApiCredentials = await requestAuth.getApiKey('admin');
      expect(adminApiCredentials.apiKey.id).toBeDefined();
      expect(adminApiCredentials.apiKey.name).toBeDefined();
    });

    apiTest(
      `setBuiltinRole should provision the custom role slot and return the descriptor`,
      async ({ samlAuth }) => {
        const descriptor = await samlAuth.setBuiltinRole('kibana_admin');
        expect(descriptor).toBeDefined();
        const credentials = await samlAuth.asInteractiveUser(samlAuth.customRoleName);
        expect(credentials.cookieValue).toBeDefined();
      }
    );

    apiTest(
      `getApiKeyForBuiltinRole should create an API key scoped to a built-in ES role`,
      async ({ requestAuth }) => {
        const { apiKey, apiKeyHeader } = await requestAuth.getApiKeyForBuiltinRole('kibana_admin');
        expect(apiKey.id).toBeDefined();
        expect(apiKey.name).toBeDefined();
        expect(apiKeyHeader.Authorization).toMatch(/^ApiKey /);
      }
    );
  }
);
