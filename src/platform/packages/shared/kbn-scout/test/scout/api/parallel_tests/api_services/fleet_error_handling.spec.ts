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
  'Fleet API Error Handling',
  { tag: [...tags.serverless.security.complete, ...tags.stateful.classic] },
  () => {
    apiTest('should handle bulk get with non-existent policy IDs', async ({ apiServices }) => {
      const nonExistentIds = [`fake-id-1-${Date.now()}`, `fake-id-2-${Date.now()}`];

      const response = await apiServices.fleet.agent_policies.bulkGet(nonExistentIds, {
        ignoreMissing: true,
      });

      expect(response).toHaveStatusCode(200);
    });
  }
);
