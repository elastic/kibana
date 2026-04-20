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
  'Fleet Agent Management',
  { tag: [...tags.serverless.security.complete, ...tags.stateful.classic] },
  () => {
    apiTest('should setup fleet agents', async ({ apiServices }) => {
      const response = await apiServices.fleet.agent.setup();

      expect(response).toHaveStatusCode(200);
    });

    apiTest('should get agents with query parameters', async ({ apiServices }) => {
      const response = await apiServices.fleet.agent.get({
        page: 1,
        perPage: 10,
        showInactive: false,
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('should handle delete of non-existent agent', async ({ apiServices }) => {
      const nonExistentAgentId = `non-existent-agent-${Date.now()}`;

      const response = await apiServices.fleet.agent.delete(nonExistentAgentId);

      // Should return 400 or 404 for non-existent agent due to ignoreErrors
      expect(response).toHaveStatusCode({ oneOf: [400, 404] });
    });
  }
);
