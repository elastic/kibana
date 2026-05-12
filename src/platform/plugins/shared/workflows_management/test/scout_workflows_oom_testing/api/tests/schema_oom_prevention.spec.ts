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
import type { WorkflowsApiService } from '../fixtures';
import { spaceTest } from '../fixtures';

const GIB = 1024 * 1024 * 1024;
const MAX_HEAP_SIZE_LIMIT_BYTES = Math.floor(1.2 * GIB);
const MAX_SETTLED_HEAP_USAGE_RATIO = 0.85;

const WORKFLOW_YAML = `
name: OOM Prevention Test Workflow
description: Exercises schema materialisation paths under memory-constrained Kibana
enabled: false
triggers:
  - type: manual
steps:
  - name: log_step
    type: console
    with:
      message: "hello"
`;

const MULTI_STEP_WORKFLOW_YAML = `
name: OOM Multi-Step Workflow
description: Multi-step workflow to stress schema materialisation with varied step types
enabled: false
triggers:
  - type: manual
steps:
  - name: log_start
    type: console
    with:
      message: "start"
  - name: wait_step
    type: wait
    with:
      duration: 1s
  - name: log_end
    type: console
    with:
      message: "end"
`;

/**
 * These tests run against a memory-constrained Kibana (1 GB old-space heap
 * via the workflows_oom_testing server config set). Each endpoint triggers
 * full workflow Zod schema materialisation. If the schema grows too large,
 * Kibana OOMs and the test fails. See the server config for rationale on
 * why 1024 MB is the chosen limit.
 *
 * Run with:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet workflows_oom_testing
 *   npx playwright test --project local --grep @stateful-classic \
 *     --config src/platform/plugins/shared/workflows_management/test/scout_workflows_oom_testing/api/playwright.config.ts
 */
spaceTest.describe('Workflow schema OOM prevention', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;

  const expectHeapUsageWithinBudget = async () => {
    const settledMetrics = await workflowsApi.waitForHeapUsageBelow(MAX_SETTLED_HEAP_USAGE_RATIO);

    // Guard against accidentally running the suite on the default larger heap.
    expect(settledMetrics.sizeLimitBytes).toBeLessThan(MAX_HEAP_SIZE_LIMIT_BYTES);
  };

  spaceTest.beforeAll(async ({ apiServices }) => {
    workflowsApi = apiServices.workflowsApi;
    await expectHeapUsageWithinBudget();
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('create and update workflow succeeds under constrained heap', async () => {
    const created = await workflowsApi.create(WORKFLOW_YAML);
    expect(created.id).toBeDefined();
    expect(created.valid).toBe(true);
    expect(created.name).toBe('OOM Prevention Test Workflow');

    const updated = await workflowsApi.update(created.id, {
      yaml: WORKFLOW_YAML.replace('hello', 'updated'),
    });
    expect(updated.id).toBe(created.id);
    expect(updated.valid).toBe(true);

    await expectHeapUsageWithinBudget();
  });

  spaceTest('validate workflow succeeds under constrained heap', async () => {
    const result = await workflowsApi.validate(WORKFLOW_YAML);
    expect(result.valid).toBe(true);

    await expectHeapUsageWithinBudget();
  });

  spaceTest('validate invalid workflow returns errors under constrained heap', async () => {
    const invalidYaml = `
name: Invalid Workflow
triggers:
  - type: nonexistent_trigger
steps:
  - name: bad_step
    type: nonexistent_step_type
`;
    const result = await workflowsApi.validate(invalidYaml);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);

    await expectHeapUsageWithinBudget();
  });

  spaceTest('create multi-step workflow succeeds under constrained heap', async () => {
    const created = await workflowsApi.create(MULTI_STEP_WORKFLOW_YAML);
    expect(created.id).toBeDefined();
    expect(created.valid).toBe(true);
    expect(created.name).toBe('OOM Multi-Step Workflow');

    await expectHeapUsageWithinBudget();
  });

  spaceTest('bulk create workflows succeeds under constrained heap', async () => {
    const result = await workflowsApi.bulkCreate([WORKFLOW_YAML, MULTI_STEP_WORKFLOW_YAML]);
    expect(result.created).toHaveLength(2);
    expect(result.failed).toHaveLength(0);

    await expectHeapUsageWithinBudget();
  });
});
