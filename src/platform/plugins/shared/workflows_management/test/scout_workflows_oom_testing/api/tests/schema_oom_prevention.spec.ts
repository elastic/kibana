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

/**
 * These tests run against a memory-constrained Kibana (1 GB heap via the
 * workflows_oom_testing server config set). Each endpoint triggers full
 * workflow Zod schema materialisation. If the schema grows too large for a
 * 1 GB pod (the serverless baseline), Kibana OOMs and the test fails.
 *
 * Run with:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet workflows_oom_testing
 *   npx playwright test --project local --grep @stateful-classic \
 *     --config src/platform/plugins/shared/workflows_management/test/scout_workflows_oom_testing/api/playwright.config.ts
 */
spaceTest.describe('Workflow schema OOM prevention', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;
  let workflowId: string;

  spaceTest.beforeAll(async ({ apiServices }) => {
    workflowsApi = apiServices.workflowsApi;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('create workflow succeeds under 1 GB heap', async () => {
    const created = await workflowsApi.create(WORKFLOW_YAML);
    expect(created.id).toBeTruthy();
    expect(created.valid).toBe(true);
    workflowId = created.id;
  });

  spaceTest('update workflow succeeds under 1 GB heap', async () => {
    const updated = await workflowsApi.update(workflowId, {
      yaml: WORKFLOW_YAML.replace('hello', 'updated'),
    });
    expect(updated.id).toBe(workflowId);
  });

  spaceTest('validate workflow succeeds under 1 GB heap', async () => {
    const result = await workflowsApi.validate(WORKFLOW_YAML);
    expect(result.valid).toBe(true);
  });
});
