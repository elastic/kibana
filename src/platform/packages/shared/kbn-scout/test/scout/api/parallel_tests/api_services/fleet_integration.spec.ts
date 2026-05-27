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
  'Fleet Integration Management',
  { tag: [...tags.serverless.security.complete, ...tags.stateful.classic] },
  () => {
    let integrationName: string;

    apiTest.beforeEach(async () => {
      integrationName = `test-integration-${Date.now()}`;
    });

    apiTest.afterEach(async ({ apiServices }) => {
      // Clean up integration
      await apiServices.fleet.integration.delete(integrationName);
    });

    apiTest('should install a custom integration', async ({ apiServices }) => {
      const response = await apiServices.fleet.integration.install(integrationName);

      expect(response).toHaveStatusCode(200);
    });

    apiTest('should delete an integration and return status code', async ({ apiServices }) => {
      // First install the integration
      await apiServices.fleet.integration.install(integrationName);

      // Then delete it
      const response = await apiServices.fleet.integration.delete(integrationName);

      expect(response).toHaveStatusCode(200);
    });

    apiTest('should handle delete of non-existent integration', async ({ apiServices }) => {
      const nonExistentIntegration = `non-existent-integration-${Date.now()}`;

      const response = await apiServices.fleet.integration.delete(nonExistentIntegration);

      // Should return 400 for non-existent integration due to ignoreErrors
      expect(response).toHaveStatusCode(400);
    });
  }
);
