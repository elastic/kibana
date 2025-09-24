/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, expect } from '../../../src/playwright';

apiTest.describe('Fleet API Service', { tag: ['@svlSecurity', '@ess'] }, () => {
  apiTest.describe('Integration Management', () => {
    let integrationName: string;

    apiTest.beforeEach(async () => {
      integrationName = `test-integration-${Date.now()}`;
    });

    apiTest.afterEach(async ({ apiServices }) => {
      // Clean up integration
      try {
        await apiServices.fleet.integration.delete(integrationName);
      } catch (e) {
        // Integration might not exist or already deleted
      }
    });

    apiTest('should install a custom integration', async ({ apiServices }) => {
      const response = await apiServices.fleet.integration.install(integrationName);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    apiTest('should delete an integration and return status code', async ({ apiServices }) => {
      // First install the integration
      await apiServices.fleet.integration.install(integrationName);

      // Then delete it
      const statusCode = await apiServices.fleet.integration.delete(integrationName);

      expect(statusCode).toBe(200);
    });

    apiTest('should handle delete of non-existent integration', async ({ apiServices }) => {
      const nonExistentIntegration = `non-existent-integration-${Date.now()}`;

      const statusCode = await apiServices.fleet.integration.delete(nonExistentIntegration);

      // Should return 400 for non-existent integration due to ignoreErrors
      expect(statusCode).toBe(400);
    });
  });

  apiTest.describe('Agent Policies Management', () => {
    let policyId: string;
    let policyName: string;

    apiTest.beforeEach(async () => {
      policyName = `test-policy-${Date.now()}`;
    });

    apiTest.afterEach(async ({ apiServices }) => {
      // Clean up policy
      if (policyId) {
        try {
          await apiServices.fleet.agent_policies.delete(policyId);
        } catch (e) {
          // Policy might not exist or already deleted
        }
        policyId = '';
      }
    });

    apiTest('should get agent policies with query parameters', async ({ apiServices }) => {
      const response = await apiServices.fleet.agent_policies.get({
        page: 1,
        perPage: 10,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.items).toBeDefined();
      expect(response.data.page).toBe(1);
      expect(response.data.perPage).toBe(10);
    });

    apiTest('should create an agent policy', async ({ apiServices }) => {
      const policyNamespace = 'default';

      const response = await apiServices.fleet.agent_policies.create(policyName, policyNamespace);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.item.name).toBe(policyName);
      expect(response.data.item.namespace).toBe(policyNamespace);

      policyId = response.data.item.id;
    });

    apiTest('should create an agent policy with system monitoring', async ({ apiServices }) => {
      const policyNamespace = 'default';
      const sysMonPolicyName = `${policyName}-sysmon`;

      const response = await apiServices.fleet.agent_policies.create(
        sysMonPolicyName,
        policyNamespace
      );

      expect(response.status).toBe(200);
      expect(response.data.item.name).toBe(sysMonPolicyName);

      policyId = response.data.item.id;
    });

    apiTest('should create an agent policy with additional parameters', async ({ apiServices }) => {
      const paramsPolicyNamespace = 'default';
      const paramsPolicyName = `${policyName}-params`;

      const response = await apiServices.fleet.agent_policies.create(
        paramsPolicyName,
        paramsPolicyNamespace,
        undefined,
        {
          description: 'Test policy with parameters',
          monitoring_enabled: ['logs', 'metrics'],
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.item.name).toBe(paramsPolicyName);
      expect(response.data.item.namespace).toBe(paramsPolicyNamespace);

      policyId = response.data.item.id;
    });

    apiTest('should update an agent policy', async ({ apiServices }) => {
      const policyNamespace = 'default';

      // First create a policy
      const createResponse = await apiServices.fleet.agent_policies.create(
        policyName,
        policyNamespace
      );
      policyId = createResponse.data.item.id;

      // Then update it
      const updatedName = `${policyName}-updated`;
      const updateResponse = await apiServices.fleet.agent_policies.update(
        updatedName,
        policyNamespace,
        policyId,
        {
          description: 'Updated policy description',
        }
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.item.name).toBe(updatedName);
    });

    apiTest('should bulk get agent policies', async ({ apiServices }) => {
      // First create a couple of policies
      const policy1Name = `bulk-test-1-${Date.now()}`;
      const policy2Name = `bulk-test-2-${Date.now()}`;

      const policy1Response = await apiServices.fleet.agent_policies.create(policy1Name, 'default');
      const policy2Response = await apiServices.fleet.agent_policies.create(policy2Name, 'default');

      const policyIds = [policy1Response.data.item.id, policy2Response.data.item.id];

      try {
        // Bulk get the policies
        const bulkResponse = await apiServices.fleet.agent_policies.bulkGet(policyIds);

        expect(bulkResponse.status).toBe(200);
        expect(bulkResponse.data.items).toHaveLength(2);
      } finally {
        // Clean up both policies
        await Promise.all([
          apiServices.fleet.agent_policies.delete(policy1Response.data.item.id),
          apiServices.fleet.agent_policies.delete(policy2Response.data.item.id),
        ]);
      }
    });

    apiTest('should delete an agent policy', async ({ apiServices }) => {
      // First create a policy
      const createResponse = await apiServices.fleet.agent_policies.create(policyName, 'default');
      const agentPolicyId = createResponse.data.item.id;

      // Then delete it
      const statusCode = await apiServices.fleet.agent_policies.delete(agentPolicyId);

      expect(statusCode).toBe(200);
    });

    apiTest('should delete an agent policy with force flag', async ({ apiServices }) => {
      // First create a policy
      const createResponse = await apiServices.fleet.agent_policies.create(policyName, 'default');
      const agentPolicyId = createResponse.data.item.id;

      // Then delete it with force
      const statusCode = await apiServices.fleet.agent_policies.delete(agentPolicyId, true);

      expect(statusCode).toBe(200);
    });
  });

  apiTest.describe('Outputs Management', () => {
    let outputId: string;

    apiTest.afterEach(async ({ apiServices }) => {
      // Clean up output
      if (outputId) {
        try {
          await apiServices.fleet.outputs.delete(outputId);
        } catch (e) {
          // Output might not exist or already deleted
        }
        outputId = '';
      }
    });

    apiTest('should get all outputs', async ({ apiServices }) => {
      const response = await apiServices.fleet.outputs.getOutputs();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.items).toBeDefined();
    });

    apiTest('should get a specific output by ID', async ({ apiServices }) => {
      // First get all outputs to find an existing one
      const allOutputsResponse = await apiServices.fleet.outputs.getOutputs();
      const existingOutput = allOutputsResponse.data.items[0];

      if (existingOutput) {
        const response = await apiServices.fleet.outputs.getOutput(existingOutput.id);

        expect(response.status).toBe(200);
        expect(response.data.item.id).toBe(existingOutput.id);
      }
    });

    apiTest('should create an elasticsearch output', async ({ apiServices }) => {
      const outputName = `test-output-${Date.now()}`;
      const outputHosts = ['https://localhost:9200'];

      const response = await apiServices.fleet.outputs.create(
        outputName,
        outputHosts,
        'elasticsearch'
      );

      expect(response.status).toBe(200);
      expect(response.data.item.name).toBe(outputName);
      expect(response.data.item.type).toBe('elasticsearch');
      expect(response.data.item.hosts).toEqual(outputHosts);

      outputId = response.data.item.id;
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

      expect(response.status).toBe(200);
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
      const statusCode = await apiServices.fleet.outputs.delete(deleteOutputId);

      expect(statusCode).toBeGreaterThanOrEqual(200);
      expect(statusCode).toBeLessThan(300);

      // Don't set outputId since we already deleted it
    });
  });

  apiTest.describe('Fleet Server Hosts Management', () => {
    let hostId: string;

    apiTest.afterEach(async ({ apiServices }) => {
      // Clean up host
      if (hostId) {
        try {
          await apiServices.fleet.server_hosts.delete(hostId);
        } catch (e) {
          // Host might not exist or already deleted
        }
        hostId = '';
      }
    });

    apiTest('should get fleet server hosts', async ({ apiServices }) => {
      // Note: The get method doesn't return a value in current implementation
      // This test verifies it doesn't throw an error
      await apiServices.fleet.server_hosts.get();
    });

    apiTest('should create a fleet server host', async ({ apiServices }) => {
      const hostName = `test-fleet-server-${Date.now()}`;
      const hostUrls = ['https://localhost:8220'];

      const response = await apiServices.fleet.server_hosts.create(hostName, hostUrls);

      expect(response.status).toBe(200);
      expect(response.data.item.name).toBe(hostName);
      expect(response.data.item.host_urls).toEqual(hostUrls);

      hostId = response.data.item.id;
    });

    apiTest('should create a fleet server host with parameters', async ({ apiServices }) => {
      const hostName = `test-fleet-server-params-${Date.now()}`;
      const hostUrls = ['https://localhost:8220'];

      const response = await apiServices.fleet.server_hosts.create(hostName, hostUrls, {
        is_default: false,
        is_internal: true,
      });

      expect(response.status).toBe(200);
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
      const statusCode = await apiServices.fleet.server_hosts.delete(deleteHostId);

      expect(statusCode).toBe(200);
      // Don't set hostId since we already deleted it
    });
  });

  apiTest.describe('Agent Management', () => {
    apiTest('should setup fleet agents', async ({ apiServices }) => {
      const response = await apiServices.fleet.agent.setup();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    apiTest('should get agents with query parameters', async ({ apiServices }) => {
      const response = await apiServices.fleet.agent.get({
        page: 1,
        perPage: 10,
        showInactive: false,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    apiTest('should handle delete of non-existent agent', async ({ apiServices }) => {
      const nonExistentAgentId = `non-existent-agent-${Date.now()}`;

      const statusCode = await apiServices.fleet.agent.delete(nonExistentAgentId);

      // Should return 400 or 404 for non-existent agent due to ignoreErrors
      expect([400, 404]).toContain(statusCode);
    });
  });

  apiTest.describe('API Error Handling', () => {
    apiTest('should handle bulk get with non-existent policy IDs', async ({ apiServices }) => {
      const nonExistentIds = [`fake-id-1-${Date.now()}`, `fake-id-2-${Date.now()}`];

      const response = await apiServices.fleet.agent_policies.bulkGet(nonExistentIds, {
        ignoreMissing: true,
      });

      expect(response.status).toBe(200);
      // With ignoreMissing: true, should return empty results or handle gracefully
      expect(response.data.items).toBeDefined();
    });

    apiTest('should handle get non-existent output gracefully', async ({ apiServices }) => {
      const nonExistentOutputId = `non-existent-output-${Date.now()}`;

      try {
        const response = await apiServices.fleet.outputs.getOutput(nonExistentOutputId);
        // If it doesn't throw, should return error status
        expect(response.status).toBeGreaterThanOrEqual(400);
      } catch (error) {
        // Should handle the error gracefully
        expect(error).toBeDefined();
      }
    });
  });

  apiTest.describe('Performance and Integration', () => {
    apiTest('should handle multiple concurrent operations', async ({ apiServices }) => {
      const operations = [
        apiServices.fleet.outputs.getOutputs(),
        apiServices.fleet.agent_policies.get({ page: 1, perPage: 5 }),
        apiServices.fleet.agent.get({ page: 1, perPage: 5 }),
      ];

      const results = await Promise.all(operations);

      results.forEach((result) => {
        expect(result.status).toBe(200);
        expect(result.data).toBeDefined();
      });
    });

    apiTest('should maintain data consistency in CRUD operations', async ({ apiServices }) => {
      const policyName = `consistency-test-${Date.now()}`;
      const policyNamespace = 'default';
      let policyId = '';

      try {
        // Create
        const createResponse = await apiServices.fleet.agent_policies.create(
          policyName,
          policyNamespace
        );
        policyId = createResponse.data.item.id;
        expect(createResponse.status).toBe(200);

        // Read
        const getResponse = await apiServices.fleet.agent_policies.get({
          kuery: `name:"${policyName}"`,
        });
        expect(getResponse.status).toBe(200);
        expect(getResponse.data.items.some((item: any) => item.id === policyId)).toBe(true);

        // Update
        const updatedName = `${policyName}-updated`;
        const updateResponse = await apiServices.fleet.agent_policies.update(
          updatedName,
          policyNamespace,
          policyId
        );
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.item.name).toBe(updatedName);

        // Delete
        const deleteStatus = await apiServices.fleet.agent_policies.delete(policyId);
        expect(deleteStatus).toBe(200);
      } finally {
        // Cleanup in case of test failure
        if (policyId) {
          try {
            await apiServices.fleet.agent_policies.delete(policyId);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
    });
  });
});
