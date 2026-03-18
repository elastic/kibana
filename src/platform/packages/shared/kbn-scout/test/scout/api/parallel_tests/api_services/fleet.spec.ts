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

apiTest.describe(
  'Fleet Outputs Management',
  { tag: [...tags.serverless.security.complete, ...tags.stateful.classic] },
  () => {
    let outputId: string;

    apiTest.afterEach(async ({ apiServices }) => {
      // Clean up output
      if (outputId) {
        await apiServices.fleet.outputs.delete(outputId);
      }
      outputId = '';
    });

    apiTest('should get all outputs', async ({ apiServices }) => {
      const response = await apiServices.fleet.outputs.getOutputs();

      expect(response).toHaveStatusCode(200);
      expect(response.data).toBeDefined();
      expect(response.data.items).toBeDefined();
    });

    apiTest('should get a specific output by ID', async ({ apiServices }) => {
      // First get all outputs to find an existing one
      const allOutputsResponse = await apiServices.fleet.outputs.getOutputs();
      const existingOutput = allOutputsResponse.data.items[0];

      // Only proceed if we have an existing output
      expect(existingOutput).toBeDefined();

      const response = await apiServices.fleet.outputs.getOutput(existingOutput.id);

      expect(response).toHaveStatusCode(200);
      expect(response.data.item.id).toBe(existingOutput.id);
    });

    apiTest('should create an output with additional parameters', async ({ apiServices }) => {
      const outputName = `test-output-params-${Date.now()}`;
      const outputHosts = ['https://localhost:9200'];

      const response = await apiServices.fleet.outputs.create(
        outputName,
        outputHosts,
        'elasticsearch',
        {
          is_default: false,
          ca_trusted_fingerprint: 'test-fingerprint',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.data.item.name).toBe(outputName);
      expect(response.data.item.is_default).toBe(false);

      outputId = response.data.item.id;
    });

    apiTest('should delete an output', async ({ apiServices }) => {
      const outputName = `test-output-delete-${Date.now()}`;

      // First create an output
      const createResponse = await apiServices.fleet.outputs.create(
        outputName,
        ['https://localhost:9200'],
        'elasticsearch'
      );
      const deleteOutputId = createResponse.data.item.id;

      // Then delete it
      const response = await apiServices.fleet.outputs.delete(deleteOutputId);

      expect(response).toHaveStatusCode(200);
      // Don't set outputId since we already deleted it
    });
  }
);

apiTest.describe(
  'Fleet Server Hosts Management',
  { tag: [...tags.serverless.security.complete, ...tags.stateful.classic] },
  () => {
    let hostId: string;

    apiTest.afterEach(async ({ apiServices }) => {
      // Clean up host
      if (hostId) {
        await apiServices.fleet.server_hosts.delete(hostId);
        // Host might not exist or already deleted
        hostId = '';
      }
    });

    apiTest('should get fleet server hosts', async ({ apiServices }) => {
      // Note: The get method doesn't return a value in current implementation
      // This test verifies it doesn't throw an error
      const resp = await apiServices.fleet.server_hosts.get();
      expect(resp.status).toBe(200);
    });

    apiTest('should create a fleet server host with parameters', async ({ apiServices }) => {
      const hostName = `test-fleet-server-params-${Date.now()}`;
      const hostUrls = ['https://localhost:8220'];

      const response = await apiServices.fleet.server_hosts.create(hostName, hostUrls, {
        is_default: false,
        is_internal: true,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.data.item.name).toBe(hostName);
      expect(response.data.item.is_default).toBe(false);
      expect(response.data.item.is_internal).toBe(true);

      hostId = response.data.item.id;
    });

    apiTest('should delete a fleet server host', async ({ apiServices }) => {
      const hostName = `test-fleet-server-delete-${Date.now()}`;

      // First create a fleet server host
      const createResponse = await apiServices.fleet.server_hosts.create(hostName, [
        'https://localhost:8220',
      ]);
      const deleteHostId = createResponse.data.item.id;

      // Then delete it
      const response = await apiServices.fleet.server_hosts.delete(deleteHostId);

      expect(response).toHaveStatusCode(200);
      // Don't set hostId since we already deleted it
    });
  }
);

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
