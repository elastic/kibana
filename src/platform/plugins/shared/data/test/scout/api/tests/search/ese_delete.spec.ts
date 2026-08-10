/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, ESE_API_PATH, COMMON_HEADERS } from '../../fixtures';

apiTest.describe(
  'ese search - delete',
  { tag: [...tags.stateful.all, ...tags.serverless.search] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    apiTest('should return 404 when no search id provided', async ({ apiClient }) => {
      const response = await apiClient.delete(ESE_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('should return 400 when trying to delete a bad id', async ({ apiClient }) => {
      const response = await apiClient.delete(`${ESE_API_PATH}/123`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('illegal_argument_exception');
      expect(response.body.attributes).toBeDefined();
      expect(response.body.attributes.root_cause).toBeDefined();
    });
  }
);
