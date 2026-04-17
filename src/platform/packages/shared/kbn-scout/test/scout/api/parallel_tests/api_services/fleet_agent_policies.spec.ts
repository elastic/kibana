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
  'Fleet Agent Policies Management',
  { tag: [...tags.serverless.security.complete, ...tags.stateful.classic] },
  () => {
    let policyId: string;
    let policyName: string;

    apiTest.beforeEach(async () => {
      policyName = `test-policy-${Date.now()}`;
    });

    apiTest.afterEach(async ({ apiServices }) => {
      // Clean up policy
      if (policyId) {
        await apiServices.fleet.agent_policies.delete(policyId);
        policyId = '';
      }
    });

    apiTest('should get agent policies with query parameters', async ({ apiServices }) => {
      const response = await apiServices.fleet.agent_policies.get({
        page: 1,
        perPage: 10,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.data.page).toBe(1);
      expect(response.data.perPage).toBe(10);
    });

    apiTest('should create an agent policy with additional parameters', async ({ apiServices }) => {
      const paramsPolicyNamespace = 'default';
      const paramsPolicyName = `${policyName}-params`;

      const response = await apiServices.fleet.agent_policies.create({
        policyName: paramsPolicyName,
        policyNamespace: paramsPolicyNamespace,
        params: {
          description: 'Test policy with parameters',
          monitoring_enabled: ['logs', 'metrics'],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.data.item.name).toBe(paramsPolicyName);
      expect(response.data.item.namespace).toBe(paramsPolicyNamespace);

      policyId = response.data.item.id;
    });

    apiTest('should update an agent policy', async ({ apiServices }) => {
      const policyNamespace = 'default';

      // First create a policy
      const createResponse = await apiServices.fleet.agent_policies.create({
        policyName,
        policyNamespace,
      });
      policyId = createResponse.data.item.id;

      // Then update it
      const updatedName = `${policyName}-updated`;
      const updateResponse = await apiServices.fleet.agent_policies.update({
        policyName: updatedName,
        policyNamespace,
        agentPolicyId: policyId,
        params: {
          description: 'Updated policy description',
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.data.item.name).toBe(updatedName);
    });

    apiTest('should bulk get agent policies', async ({ apiServices }) => {
      // First create a couple of policies
      const policy1Name = `bulk-test-1-${Date.now()}`;
      const policy2Name = `bulk-test-2-${Date.now()}`;

      const policy1Response = await apiServices.fleet.agent_policies.create({
        policyName: policy1Name,
        policyNamespace: 'default',
      });
      const policy2Response = await apiServices.fleet.agent_policies.create({
        policyName: policy2Name,
        policyNamespace: 'default',
      });

      const policyIds = [policy1Response.data.item.id, policy2Response.data.item.id];
      // Bulk get the policies
      const bulkResponse = await apiServices.fleet.agent_policies.bulkGet(policyIds);
      expect(bulkResponse).toHaveStatusCode(200);
      expect(bulkResponse.data.items).toHaveLength(2);
      // Clean up both policies
      await Promise.all([
        apiServices.fleet.agent_policies.delete(policy1Response.data.item.id),
        apiServices.fleet.agent_policies.delete(policy2Response.data.item.id),
      ]);
    });

    apiTest('should delete an agent policy', async ({ apiServices }) => {
      // First create a policy
      const createResponse = await apiServices.fleet.agent_policies.create({
        policyName,
        policyNamespace: 'default',
      });
      const agentPolicyId = createResponse.data.item.id;

      // Then delete it
      const response = await apiServices.fleet.agent_policies.delete(agentPolicyId);

      expect(response).toHaveStatusCode(200);
    });

    apiTest('should delete an agent policy with force flag', async ({ apiServices }) => {
      // First create a policy
      const createResponse = await apiServices.fleet.agent_policies.create({
        policyName,
        policyNamespace: 'default',
      });
      const agentPolicyId = createResponse.data.item.id;

      // Then delete it with force
      const response = await apiServices.fleet.agent_policies.delete(agentPolicyId, true);

      expect(response).toHaveStatusCode(200);
    });
  }
);
