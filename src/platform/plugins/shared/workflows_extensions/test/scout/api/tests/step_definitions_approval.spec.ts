/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { APPROVED_STEP_DEFINITIONS } from '../fixtures/approved_step_definitions';
import { COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Workflows Extensions - Custom Step Definitions Approval',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
      ...tags.serverless.workplaceai,
    ],
  },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest(
      'should validate that all registered custom step definitions are approved by workflows-eng team',
      async ({ apiClient }) => {
        const response = await apiClient.get('internal/workflows_extensions/step_definitions', {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.steps).toBeDefined();
        expect(Array.isArray(response.body.steps)).toBe(true);

        for (const step of response.body.steps) {
          const approvedStep = APPROVED_STEP_DEFINITIONS.find(({ id }) => id === step.id);

          expect(approvedStep, {
            message: `Step "${step.id}" is not in the approved list`,
          }).toBeDefined();

          expect(step.handlerHash, {
            message: `Step "${step.id}" has an invalid handler hash`,
          }).toBe(approvedStep?.handlerHash);
        }
      }
    );
  }
);
