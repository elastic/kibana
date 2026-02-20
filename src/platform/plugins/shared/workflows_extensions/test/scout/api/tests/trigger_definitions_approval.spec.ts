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
import { APPROVED_TRIGGER_DEFINITIONS } from '../fixtures/approved_trigger_definitions';
import { COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Workflows Extensions - Custom Trigger Definitions Approval',
  { tag: ['@ess', '@svlSearch', '@svlSecurity', '@svlOblt', '@svlWorkplaceAI'] },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest(
      'should validate that all registered custom trigger definitions are approved by workflows-eng team',
      async ({ apiClient }) => {
        const response = await apiClient.get('internal/workflows_extensions/trigger_definitions', {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(
          response.body && typeof response.body === 'object' && 'triggers' in response.body
        ).toBe(true);
        expect(Array.isArray(response.body.triggers)).toBe(true);

        for (const trigger of response.body.triggers) {
          const approvedTrigger = APPROVED_TRIGGER_DEFINITIONS.find(({ id }) => id === trigger.id);

          expect(approvedTrigger, {
            message: `Trigger "${trigger.id}" is not in the approved list`,
          }).toBeDefined();

          expect(approvedTrigger?.schemaHash, {
            message: `Trigger "${trigger.id}" has an invalid schema hash`,
          }).toBe(trigger.schemaHash);
        }
      }
    );
  }
);
