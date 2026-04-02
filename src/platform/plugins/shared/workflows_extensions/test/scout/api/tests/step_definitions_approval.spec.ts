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

        // Registered ⊆ approved: every step returned by the server must be listed in the fixture
        // with a matching handler hash (catches new or changed handlers not yet approved).
        for (const step of response.body.steps) {
          const approvedStep = APPROVED_STEP_DEFINITIONS.find(({ id }) => id === step.id);

          expect(approvedStep, {
            message: `Step "${step.id}" is not in the approved list`,
          }).toBeDefined();

          expect(step.handlerHash, {
            message: `Step "${step.id}" has an invalid handler hash`,
          }).toBe(approvedStep?.handlerHash);
        }

        // Approved ⊆ registered: every fixture row must still exist on the server with the same hash
        // (catches stale rows left after a step was removed or the list was not updated).
        for (const approved of APPROVED_STEP_DEFINITIONS) {
          const registeredStep = response.body.steps.find(
            (step: { id: string; handlerHash: string }) => step.id === approved.id
          );

          expect(registeredStep, {
            message: `Approved list contains stale entry "${approved.id}" that is not registered`,
          }).toBeDefined();

          expect(registeredStep?.handlerHash, {
            message: `Approved entry "${approved.id}" has an invalid handler hash (does not match registered step)`,
          }).toBe(approved.handlerHash);
        }
      }
    );
  }
);
