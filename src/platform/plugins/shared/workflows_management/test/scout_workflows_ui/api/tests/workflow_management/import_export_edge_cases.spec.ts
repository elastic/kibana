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
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { spaceTest } from '../../fixtures';

const SIMPLE_WORKFLOW_YAML = `
name: Import Edge Case Workflow
description: A simple test workflow
enabled: false
triggers:
  - type: manual
steps:
  - type: console
    name: Step 1
    with:
      message: hello
`;

const WORKFLOW_WITH_SPECIAL_NAME = `
name: "Workflow: with/special 'chars' & unicode ñ 日本語"
description: Tests special characters in name
enabled: false
triggers:
  - type: manual
steps:
  - type: console
    name: step_1
    with:
      message: hello
`;

const WORKFLOW_WITH_CONNECTOR_REF = `
name: Workflow With Connector Ref
description: References a connector that likely does not exist
enabled: false
triggers:
  - type: manual
steps:
  - type: slack
    name: send_slack
    connector-id: "non-existent-slack-connector-id"
    with:
      message: "Hello"
`;

spaceTest.describe('Import/Export edge cases', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;

  spaceTest.beforeAll(async ({ apiServices }) => {
    workflowsApi = apiServices.workflowsApi;
  });

  spaceTest.afterEach(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('export then import produces equivalent workflow', async () => {
    const created = await workflowsApi.create(SIMPLE_WORKFLOW_YAML);
    const originalName = created.name;

    await workflowsApi.bulkDelete([created.id]);
    const listAfterDelete = await workflowsApi.list();
    expect(listAfterDelete.results.map((w) => w.id)).not.toContain(created.id);

    const reimported = await workflowsApi.create(SIMPLE_WORKFLOW_YAML);
    expect(reimported.name).toBe(originalName);
    expect(reimported.valid).toBe(true);
  });

  spaceTest('workflow with special characters in name survives round-trip', async () => {
    const created = await workflowsApi.create(WORKFLOW_WITH_SPECIAL_NAME);
    expect(created.valid).toBe(true);

    const fetched = await workflowsApi.getWorkflow(created.id);
    expect(fetched.name).toContain('special');
    expect(fetched.name).toContain('unicode');
  });

  spaceTest(
    'workflow referencing non-existent connector can be created but is flagged',
    async () => {
      const created = await workflowsApi.create(WORKFLOW_WITH_CONNECTOR_REF);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
    }
  );

  spaceTest('duplicate workflow names are allowed', async () => {
    const first = await workflowsApi.create(SIMPLE_WORKFLOW_YAML);
    const second = await workflowsApi.create(SIMPLE_WORKFLOW_YAML);

    expect(first.id).not.toBe(second.id);
    expect(first.name).toBe(second.name);

    const list = await workflowsApi.list();
    const matchingNames = list.results.filter((w) => w.name === 'Import Edge Case Workflow');
    expect(matchingNames.length).toBeGreaterThan(1);
  });

  spaceTest('bulk create empty array', async () => {
    const result = await workflowsApi.bulkCreate([]);

    expect(result.created).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
  });

  spaceTest('mixed batch — one valid, one invalid workflow in bulk create', async () => {
    const result = await workflowsApi.bulkCreate([
      SIMPLE_WORKFLOW_YAML,
      'completely: broken: yaml: [[[',
    ]);

    const totalProcessed = result.created.length + result.failed.length;
    expect(totalProcessed).toBe(2);
    expect(result.created.length).toBeGreaterThan(0);
  });
});
