/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest } from '../../../../../src/playwright';
import { expect } from '../../../../../api';

interface ApiResponse {
  status: number;
  data: Record<string, any>;
}

apiTest.describe('Fleet Integration Management', { tag: ['@svlSecurity', '@ess'] }, () => {
  let integrationName: string;

  apiTest.beforeEach(async () => {
    integrationName = `test-integration-${Date.now()}`;
  });

  apiTest.afterEach(async ({ apiServices }) => {
    // Clean up integration
    await apiServices.fleet.integration.delete(integrationName);
  });

  apiTest('should install a custom integration', async ({ apiServices }) => {
    const response: ApiResponse = await apiServices.fleet.integration.install(integrationName);

    expect(response).toHaveStatusCode(200);
  });

  apiTest('should delete an integration and return status code', async ({ apiServices }) => {
    // First install the integration
    await apiServices.fleet.integration.install(integrationName);

    // Then delete it
    const response: ApiResponse = await apiServices.fleet.integration.delete(integrationName);

    expect(response).toHaveStatusCode(200);
  });

  apiTest('should handle delete of non-existent integration', async ({ apiServices }) => {
    const nonExistentIntegration = `non-existent-integration-${Date.now()}`;

    const response: ApiResponse = await apiServices.fleet.integration.delete(
      nonExistentIntegration
    );

    // Should return 400 for non-existent integration due to ignoreErrors
    expect(response).toHaveStatusCode(400);
  });
});

apiTest.describe('Fleet Agent Policies Management', { tag: ['@svlSecurity', '@ess'] }, () => {
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
    const response: ApiResponse = await apiServices.fleet.agent_policies.get({
      page: 1,
      perPage: 10,
    });

    expect(response).toHaveStatusCode(200);
    expect(response).toHavePayload({ page: 1, perPage: 10 });
  });

  apiTest('should create an agent policy with additional parameters', async ({ apiServices }) => {
    const paramsPolicyNamespace = 'default';
    const paramsPolicyName = `${policyName}-params`;

    const response: ApiResponse = await apiServices.fleet.agent_policies.create(
      paramsPolicyName,
      paramsPolicyNamespace,
      undefined,
      {
        description: 'Test policy with parameters',
        monitoring_enabled: ['logs', 'metrics'],
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response).toHavePayload({
      item: { name: paramsPolicyName, namespace: paramsPolicyNamespace },
    });

    policyId = response.data.item.id;
  });

  apiTest('should update an agent policy', async ({ apiServices }) => {
    const policyNamespace = 'default';

    // First create a policy
    const createResponse: ApiResponse = await apiServices.fleet.agent_policies.create(
      policyName,
      policyNamespace
    );
    policyId = createResponse.data.item.id;

    // Then update it
    const updatedName = `${policyName}-updated`;
    const updateResponse: ApiResponse = await apiServices.fleet.agent_policies.update(
      updatedName,
      policyNamespace,
      policyId,
      {
        description: 'Updated policy description',
      }
    );

    expect(updateResponse).toHaveStatusCode(200);
    expect(updateResponse).toHavePayload({ item: { name: updatedName } });
  });

  apiTest('should bulk get agent policies', async ({ apiServices }) => {
    // First create a couple of policies
    const policy1Name = `bulk-test-1-${Date.now()}`;
    const policy2Name = `bulk-test-2-${Date.now()}`;

    const policy1Response: ApiResponse = await apiServices.fleet.agent_policies.create(
      policy1Name,
      'default'
    );
    const policy2Response: ApiResponse = await apiServices.fleet.agent_policies.create(
      policy2Name,
      'default'
    );

    const policyIds = [policy1Response.data.item.id, policy2Response.data.item.id];
    // Bulk get the policies
    const bulkResponse: ApiResponse = await apiServices.fleet.agent_policies.bulkGet(policyIds);
    expect(bulkResponse).toHaveStatusCode(200);
    expect(bulkResponse).toHavePayload({
      items: [{ id: policy1Response.data.item.id }, { id: policy2Response.data.item.id }],
    });
    // Clean up both policies
    await Promise.all([
      apiServices.fleet.agent_policies.delete(policy1Response.data.item.id),
      apiServices.fleet.agent_policies.delete(policy2Response.data.item.id),
    ]);
  });

  apiTest('should delete an agent policy', async ({ apiServices }) => {
    // First create a policy
    const createResponse: ApiResponse = await apiServices.fleet.agent_policies.create(
      policyName,
      'default'
    );
    const agentPolicyId = createResponse.data.item.id;

    // Then delete it
    const response: ApiResponse = await apiServices.fleet.agent_policies.delete(agentPolicyId);

    expect(response).toHaveStatusCode(200);
  });

  apiTest('should delete an agent policy with force flag', async ({ apiServices }) => {
    // First create a policy
    const createResponse: ApiResponse = await apiServices.fleet.agent_policies.create(
      policyName,
      'default'
    );
    const agentPolicyId = createResponse.data.item.id;

    // Then delete it with force
    const response: ApiResponse = await apiServices.fleet.agent_policies.delete(
      agentPolicyId,
      true
    );

    expect(response).toHaveStatusCode(200);
  });
});

apiTest.describe('Fleet Outputs Management', { tag: ['@svlSecurity', '@ess'] }, () => {
  let outputId: string;

  apiTest.afterEach(async ({ apiServices }) => {
    // Clean up output
    if (outputId) {
      await apiServices.fleet.outputs.delete(outputId);
    }
    outputId = '';
  });

  apiTest('should get all outputs', async ({ apiServices }) => {
    const response: ApiResponse = await apiServices.fleet.outputs.getOutputs();

    expect(response).toHaveStatusCode(200);
    expect(response).toHavePayload({ items: expect.toHaveLength() });
  });

  apiTest('should get a specific output by ID', async ({ apiServices }) => {
    // First get all outputs to find an existing one
    const allOutputsResponse: ApiResponse = await apiServices.fleet.outputs.getOutputs();
    const existingOutput = allOutputsResponse.data.items[0];

    // Only proceed if we have an existing output
    expect(existingOutput).toBeDefined();

    const response: ApiResponse = await apiServices.fleet.outputs.getOutput(existingOutput.id);

    expect(response).toHaveStatusCode(200);
    expect(response).toHavePayload({ item: { id: existingOutput.id } });
  });

  apiTest('should create an output with additional parameters', async ({ apiServices }) => {
    const outputName = `test-output-params-${Date.now()}`;
    const outputHosts = ['https://localhost:9200'];

    const response: ApiResponse = await apiServices.fleet.outputs.create(
      outputName,
      outputHosts,
      'elasticsearch',
      {
        is_default: false,
        ca_trusted_fingerprint: 'test-fingerprint',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response).toHavePayload({ item: { name: outputName, is_default: false } });

    outputId = response.data.item.id;
  });

  apiTest('should delete an output', async ({ apiServices }) => {
    const outputName = `test-output-delete-${Date.now()}`;

    // First create an output
    const createResponse: ApiResponse = await apiServices.fleet.outputs.create(
      outputName,
      ['https://localhost:9200'],
      'elasticsearch'
    );
    const deleteOutputId = createResponse.data.item.id;

    // Then delete it
    const response: ApiResponse = await apiServices.fleet.outputs.delete(deleteOutputId);

    expect(response).toHaveStatusCode(200);
    // Don't set outputId since we already deleted it
  });
});

apiTest.describe('Fleet Server Hosts Management', { tag: ['@svlSecurity', '@ess'] }, () => {
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
    await apiServices.fleet.server_hosts.get();
  });

  apiTest('should create a fleet server host with parameters', async ({ apiServices }) => {
    const hostName = `test-fleet-server-params-${Date.now()}`;
    const hostUrls = ['https://localhost:8220'];

    const response: ApiResponse = await apiServices.fleet.server_hosts.create(hostName, hostUrls, {
      is_default: false,
      is_internal: true,
    });

    expect(response).toHaveStatusCode(200);
    expect(response).toHavePayload({
      item: { name: hostName, is_default: false, is_internal: true },
    });

    hostId = response.data.item.id;
  });

  apiTest('should delete a fleet server host', async ({ apiServices }) => {
    const hostName = `test-fleet-server-delete-${Date.now()}`;

    // First create a fleet server host
    const createResponse: ApiResponse = await apiServices.fleet.server_hosts.create(hostName, [
      'https://localhost:8220',
    ]);
    const deleteHostId = createResponse.data.item.id;

    // Then delete it
    const response: ApiResponse = await apiServices.fleet.server_hosts.delete(deleteHostId);

    expect(response).toHaveStatusCode(200);
    // Don't set hostId since we already deleted it
  });
});

apiTest.describe('Fleet Agent Management', { tag: ['@svlSecurity', '@ess'] }, () => {
  apiTest('should setup fleet agents', async ({ apiServices }) => {
    const response: ApiResponse = await apiServices.fleet.agent.setup();

    expect(response).toHaveStatusCode(200);
  });

  apiTest('should get agents with query parameters', async ({ apiServices }) => {
    const response: ApiResponse = await apiServices.fleet.agent.get({
      page: 1,
      perPage: 10,
      showInactive: false,
    });

    expect(response).toHaveStatusCode(200);
  });

  apiTest('should handle delete of non-existent agent', async ({ apiServices }) => {
    const nonExistentAgentId = `non-existent-agent-${Date.now()}`;

    const response: ApiResponse = await apiServices.fleet.agent.delete(nonExistentAgentId);

    // Should return 400 or 404 for non-existent agent due to ignoreErrors
    expect(response).toHaveStatusCode({ oneOf: [400, 404] });
  });
});

apiTest.describe('Fleet API Error Handling', { tag: ['@svlSecurity', '@ess'] }, () => {
  apiTest('should handle bulk get with non-existent policy IDs', async ({ apiServices }) => {
    const nonExistentIds = [`fake-id-1-${Date.now()}`, `fake-id-2-${Date.now()}`];

    const response: ApiResponse = await apiServices.fleet.agent_policies.bulkGet(nonExistentIds, {
      ignoreMissing: true,
    });

    expect(response).toHaveStatusCode(200);
  });
});
