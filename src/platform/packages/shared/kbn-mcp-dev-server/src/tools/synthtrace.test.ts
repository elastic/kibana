/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * E2E Test: Simulating an LLM calling the synthtrace MCP tool
 *
 * This test simulates how an LLM would interact with the synthtrace tool:
 * 1. Get schema to understand the format
 * 2. Get examples for reference
 * 3. Generate a config from a prompt
 * 4. Validate the config
 * 5. Estimate event counts
 */

import { synthtraceTool } from './synthtrace';

async function simulateLLMFlow() {
  // Step 1: LLM gets schema to understand format
  const schemaResult = await synthtraceTool.handler({
    action: 'get_schema',
    payload: undefined,
  });
  const schema = JSON.parse(schemaResult.content[0].text);

  // Step 2: LLM gets examples for reference
  const examplesResult = await synthtraceTool.handler({
    action: 'get_examples',
    payload: undefined,
  });
  const examples = JSON.parse(examplesResult.content[0].text);

  // Step 3: LLM generates config from prompt (simulated)
  const prompt =
    'Generate transactions for a service called "checkout-service" with 20 transactions per minute, each transaction should have 3 spans, and also generate metrics for CPU and memory';

  const generateResult = await synthtraceTool.handler({
    action: 'generate',
    payload: { prompt },
  });
  const generateResponse = JSON.parse(generateResult.content[0].text);

  // Step 4: LLM creates config based on schema and examples (simulated LLM generation)
  const generatedConfig = {
    timeWindow: {
      from: 'now-1h',
      to: 'now',
    },
    services: [
      {
        id: 'checkout-service',
        name: 'checkout-service',
        environment: 'production',
        agentName: 'nodejs',
        instances: [
          {
            id: 'instance-1',
            traces: [
              {
                id: 'checkout-trace',
                name: 'POST /api/checkout',
                count: 20,
                spans: [
                  {
                    name: 'Validate Order',
                    type: 'app',
                    durationMs: 50,
                  },
                  {
                    name: 'Process Payment',
                    type: 'external',
                    durationMs: 300,
                  },
                  {
                    name: 'Update Inventory',
                    type: 'db',
                    durationMs: 100,
                  },
                ],
              },
            ],
            metrics: [
              {
                metrics: {
                  'system.cpu.total.norm.pct': 0.65,
                  'system.memory.actual.free': 750,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  // Step 5: Validate the config
  const validateResult = await synthtraceTool.handler({
    action: 'validate',
    payload: { config: generatedConfig },
  });
  const validation = JSON.parse(validateResult.content[0].text);
  if (!validation.valid) {
    throw new Error(`Config validation failed: ${JSON.stringify(validation.errors)}`);
  }

  // Step 6: Estimate event counts
  const estimateResult = await synthtraceTool.handler({
    action: 'estimate',
    payload: { config: generatedConfig },
  });
  const estimate = JSON.parse(estimateResult.content[0].text);

  // Test 2: Failed and Degraded Docs Scenario

  // Test prompt parsing for failed docs
  const failedDocsPrompt =
    'Ingest 100 documents to logs-foo.error-default with 50% of them as failed docs';
  const failedDocsGenerateResult = await synthtraceTool.handler({
    action: 'generate',
    payload: { prompt: failedDocsPrompt },
  });
  JSON.parse(failedDocsGenerateResult.content[0].text);

  // Create config with failureRate
  const failedDocsConfig = {
    timeWindow: {
      from: 'now-1h',
      to: 'now',
    },
    services: [
      {
        id: 'foo-service',
        name: 'foo-service',
        environment: 'production',
        agentName: 'nodejs',
        instances: [
          {
            id: 'instance-1',
            logs: [
              {
                message: 'Error log entry',
                level: 'error',
                rate: 100,
                dataset: 'foo.error',
                failureRate: 0.5, // 50% failed docs
              },
            ],
          },
        ],
      },
    ],
  };

  const failedDocsValidateResult = await synthtraceTool.handler({
    action: 'validate',
    payload: { config: failedDocsConfig },
  });
  const failedDocsValidation = JSON.parse(failedDocsValidateResult.content[0].text);
  if (!failedDocsValidation.valid) {
    throw new Error(
      `Failed docs config validation failed: ${JSON.stringify(failedDocsValidation.errors)}`
    );
  }

  // Test prompt parsing for both degraded and failed docs
  const bothDocsPrompt = 'Ingest docs with 50% degraded and 25% failed docs';
  const bothDocsGenerateResult = await synthtraceTool.handler({
    action: 'generate',
    payload: { prompt: bothDocsPrompt },
  });
  JSON.parse(bothDocsGenerateResult.content[0].text);

  // Create config with both degradedRate and failureRate
  const bothDocsConfig = {
    timeWindow: {
      from: 'now-1h',
      to: 'now',
    },
    services: [
      {
        id: 'test-service',
        name: 'test-service',
        environment: 'production',
        agentName: 'nodejs',
        instances: [
          {
            id: 'instance-1',
            logs: [
              {
                message: 'Test log entry',
                level: 'info',
                rate: 10,
                degradedRate: 0.5, // 50% degraded docs
                failureRate: 0.25, // 25% failed docs
              },
            ],
          },
        ],
      },
    ],
  };

  const bothDocsValidateResult = await synthtraceTool.handler({
    action: 'validate',
    payload: { config: bothDocsConfig },
  });
  const bothDocsValidation = JSON.parse(bothDocsValidateResult.content[0].text);
  if (!bothDocsValidation.valid) {
    throw new Error(
      `Both docs config validation failed: ${JSON.stringify(bothDocsValidation.errors)}`
    );
  }

  // Test estimation for failed/degraded docs
  const estimateBothResult = await synthtraceTool.handler({
    action: 'estimate',
    payload: { config: bothDocsConfig },
  });
  JSON.parse(estimateBothResult.content[0].text);
}

// Run if executed directly
if (require.main === module) {
  simulateLLMFlow().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Test failed:', err);
    process.exit(1);
  });
}

export { simulateLLMFlow };
