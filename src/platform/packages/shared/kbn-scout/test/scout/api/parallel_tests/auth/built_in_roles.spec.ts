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

apiTest.describe(`Built-in ES roles`, { tag: tags.stateful.classic }, () => {
  apiTest(
    `setBuiltInRole should throw when the role does not exist in Elasticsearch`,
    async ({ samlAuth }) => {
      await expect(samlAuth.setBuiltInRole('this_role_does_not_exist_scout_test')).rejects.toThrow(
        `Role 'this_role_does_not_exist_scout_test' not found in Elasticsearch`
      );
    }
  );

  apiTest(
    `setBuiltInRole should throw when called on a Serverless project`,
    {
      tag: [
        ...tags.serverless.search,
        ...tags.serverless.security.complete,
        ...tags.serverless.observability.complete,
      ],
    },
    async ({ samlAuth, config }) => {
      apiTest.skip(
        !config.serverless,
        'Only validates the Serverless guard on Serverless projects'
      );
      await expect(samlAuth.setBuiltInRole('kibana_admin')).rejects.toThrow(
        `setBuiltInRole('kibana_admin') is not supported on Serverless projects`
      );
    }
  );

  apiTest(
    `setBuiltInRole should provision the custom role slot and return the descriptor`,
    async ({ samlAuth }) => {
      const descriptor = await samlAuth.setBuiltInRole('kibana_admin');
      expect(descriptor).toBeDefined();
      const credentials = await samlAuth.asInteractiveUser(samlAuth.customRoleName);
      expect(credentials.cookieValue).toBeDefined();
    }
  );

  apiTest(
    `getApiKeyForBuiltInRole should create an API key scoped to a built-in ES role`,
    async ({ requestAuth }) => {
      const { apiKey, apiKeyHeader } = await requestAuth.getApiKeyForBuiltInRole('kibana_admin');
      expect(apiKey.id).toBeDefined();
      expect(apiKey.name).toBeDefined();
      expect(apiKeyHeader.Authorization).toMatch(/^ApiKey /);
    }
  );
});
