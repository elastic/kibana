/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

/**
 * Duplicate fallback step names cause a graph cycle because the execution
 * graph generates duplicate node IDs. The fix is API/UI validation that
 * blocks workflows with non-unique step names. This test verifies that the
 * engine surfaces the error (instead of silently leaving the execution in
 * PENDING) when such a workflow bypasses validation and reaches the engine.
 */
describe('duplicate fallback step names cause graph cycle', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  it('should throw a graph cycle error when fallback steps share the same name', async () => {
    const yaml = `
steps:
  - name: triage_alert
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      retry:
        max-attempts: 2
        delay: 1s
      fallback:
        - name: notify_email_failure
          type: ${FakeConnectors.slack1.actionTypeId}
          connector-id: ${FakeConnectors.slack1.name}
          with:
            message: 'Triage failed'
    with:
      message: 'Triage the alert'

  - name: create_report
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      retry:
        max-attempts: 2
        delay: 1s
      fallback:
        - name: notify_email_failure
          type: ${FakeConnectors.slack2.actionTypeId}
          connector-id: ${FakeConnectors.slack2.name}
          with:
            message: 'Report failed'
    with:
      message: 'Create a report'

  - name: post_to_alert
    type: ${FakeConnectors.slack1.actionTypeId}
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Post to alert'
`;

    await expect(workflowRunFixture.runWorkflow({ workflowYaml: yaml })).rejects.toThrow();
  });
});
