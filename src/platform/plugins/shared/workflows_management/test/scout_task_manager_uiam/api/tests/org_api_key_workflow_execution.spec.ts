/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { spaceTest } from '../../../scout/api/fixtures';

const ORG_API_KEY_HEADERS = {
  Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
  'kbn-xsrf': 'true',
};

const WORKFLOW_YAML = `name: UIAM organization API key workflow
description: Verifies Task Manager can clone an external UIAM API key
enabled: true
triggers:
  - type: manual
steps:
  - name: log_message
    type: console
    with:
      message: Workflow executed with a UIAM organization API key
`;

spaceTest.describe(
  '[NON-MKI] Workflow execution with an organization-level UIAM API key',
  { tag: [...tags.serverless.observability.complete] },
  () => {
    let workflowId: string | undefined;

    spaceTest.afterAll(async ({ apiServices }) => {
      if (workflowId) {
        await apiServices.workflowsApi.hardDelete(workflowId);
      }
    });

    spaceTest('grants a Task Manager key and completes the workflow', async ({ apiServices }) => {
      const workflow = await apiServices.workflowsApi.create(WORKFLOW_YAML);
      workflowId = workflow.id;

      const { workflowExecutionId } = await apiServices.workflowsApi.run(
        workflow.id,
        {},
        ORG_API_KEY_HEADERS
      );
      expect(typeof workflowExecutionId).toBe('string');

      const execution = await apiServices.workflowsApi.waitForTermination({
        workflowExecutionId,
      });
      expect(execution?.status).toBe('completed');
    });
  }
);
