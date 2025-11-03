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
  console.log('=== Simulating LLM Flow: Prompt → Config → Validate → Estimate ===\n');

  // Step 1: LLM gets schema to understand format
  console.log('Step 1: Getting schema...');
  const schemaResult = await synthtraceTool.handler({
    action: 'get_schema',
    payload: undefined,
  });
  const schema = JSON.parse(schemaResult.content[0].text);
  console.log(
    `✅ Schema retrieved: ${Object.keys(schema.definitions || schema).length} definitions\n`
  );

  // Step 2: LLM gets examples for reference
  console.log('Step 2: Getting examples...');
  const examplesResult = await synthtraceTool.handler({
    action: 'get_examples',
    payload: undefined,
  });
  const examples = JSON.parse(examplesResult.content[0].text);
  console.log(`✅ Examples retrieved: ${Object.keys(examples).length} example files\n`);

  // Step 3: LLM generates config from prompt (simulated)
  console.log('Step 3: Generating config from prompt...');
  const prompt =
    'Generate transactions for a service called "checkout-service" with 20 transactions per minute, each transaction should have 3 spans, and also generate metrics for CPU and memory';

  const generateResult = await synthtraceTool.handler({
    action: 'generate',
    payload: { prompt },
  });
  const generateResponse = JSON.parse(generateResult.content[0].text);
  console.log(`✅ Generate response received: ${generateResponse.message}\n`);

  // Step 4: LLM creates config based on schema and examples (simulated LLM generation)
  console.log('Step 4: LLM-generated config (simulated)...');
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
  console.log(
    'Generated config:',
    JSON.stringify(generatedConfig, null, 2).substring(0, 200) + '...\n'
  );

  // Step 5: Validate the config
  console.log('Step 5: Validating config...');
  const validateResult = await synthtraceTool.handler({
    action: 'validate',
    payload: { config: generatedConfig },
  });
  const validation = JSON.parse(validateResult.content[0].text);
  if (validation.valid) {
    console.log('✅ Config is valid!\n');
  } else {
    console.log('❌ Config validation failed:', validation.errors);
    return;
  }

  // Step 6: Estimate event counts
  console.log('Step 6: Estimating event counts...');
  const estimateResult = await synthtraceTool.handler({
    action: 'estimate',
    payload: { config: generatedConfig },
  });
  const estimate = JSON.parse(estimateResult.content[0].text);
  console.log(`✅ Estimated ${estimate.estimatedEvents} events will be generated\n`);

  console.log('=== E2E Flow Complete! ===');
  console.log('\nSummary:');
  console.log(`- Schema: ✅ Retrieved`);
  console.log(`- Examples: ✅ Retrieved (${Object.keys(examples).length} files)`);
  console.log(`- Config Generation: ✅ Simulated`);
  console.log(`- Validation: ✅ Passed`);
  console.log(`- Estimation: ✅ ${estimate.estimatedEvents} events`);
}

// Run if executed directly
if (require.main === module) {
  simulateLLMFlow().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}

export { simulateLLMFlow };
