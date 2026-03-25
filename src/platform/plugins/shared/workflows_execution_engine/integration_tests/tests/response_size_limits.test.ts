/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('response size limits', () => {
  describe('Layer 2: base class output enforcement', () => {
    describe('BEFORE: no limit enforced', () => {
      let workflowRunFixture: WorkflowRunFixture;

      beforeAll(async () => {
        workflowRunFixture = new WorkflowRunFixture();
        // Disable size limit to simulate the "before" state
        const noLimit = new ByteSizeValue(0);
        (workflowRunFixture.configMock as any).maxResponseSize = noLimit;
        workflowRunFixture.dependencies.config.maxResponseSize = noLimit;

        const workflowYaml = `
steps:
  - name: large_step
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 5120
`;
        await workflowRunFixture.runWorkflow({ workflowYaml });
      });

      it('connector step with large output completes successfully when limit is disabled', () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
        expect(workflowExecutionDoc?.error).toBeUndefined();
      });
    });

    describe('AFTER: limit enforced', () => {
      let workflowRunFixture: WorkflowRunFixture;

      beforeAll(async () => {
        workflowRunFixture = new WorkflowRunFixture();
        // Set a 1KB limit -- the connector returns 5KB, so it should fail
        const limit1kb = new ByteSizeValue(1024);
        (workflowRunFixture.configMock as any).maxResponseSize = limit1kb;
        workflowRunFixture.dependencies.config.maxResponseSize = limit1kb;

        const workflowYaml = `
steps:
  - name: large_step
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 5120
`;
        await workflowRunFixture.runWorkflow({ workflowYaml });
      });

      it('connector step with large output fails with ResponseSizeLimitExceeded', () => {
        // Workflow should be COMPLETED (engine continues after step failure)
        // but the step itself should have failed
        const stepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        );
        const largeStep = stepExecutions.find((s) => s.stepId === 'large_step');
        expect(largeStep?.status).toBe(ExecutionStatus.FAILED);
        expect(largeStep?.error?.type).toBe('StepSizeLimitExceeded');
      });
    });

    describe('output within limit passes through', () => {
      let workflowRunFixture: WorkflowRunFixture;

      beforeAll(async () => {
        workflowRunFixture = new WorkflowRunFixture();
        // Set a 10KB limit -- the connector returns 5KB, so it should pass
        const limit10kb = new ByteSizeValue(10 * 1024);
        (workflowRunFixture.configMock as any).maxResponseSize = limit10kb;
        workflowRunFixture.dependencies.config.maxResponseSize = limit10kb;

        const workflowYaml = `
steps:
  - name: small_step
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 5120
`;
        await workflowRunFixture.runWorkflow({ workflowYaml });
      });

      it('step with output under limit completes normally', () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
        expect(workflowExecutionDoc?.error).toBeUndefined();
      });
    });

    describe('step-level max-step-size overrides plugin config', () => {
      let workflowRunFixture: WorkflowRunFixture;

      beforeAll(async () => {
        workflowRunFixture = new WorkflowRunFixture();
        // Plugin config: 1KB (would reject 5KB output)
        const limit1kb = new ByteSizeValue(1024);
        (workflowRunFixture.configMock as any).maxResponseSize = limit1kb;
        workflowRunFixture.dependencies.config.maxResponseSize = limit1kb;

        // But step-level override allows 10KB
        const workflowYaml = `
steps:
  - name: large_step_with_override
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    max-step-size: 10kb
    with:
      sizeBytes: 5120
`;
        await workflowRunFixture.runWorkflow({ workflowYaml });
      });

      it('step succeeds because step-level limit (10kb) overrides plugin config (1kb)', () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
        expect(workflowExecutionDoc?.error).toBeUndefined();
      });
    });

    describe('workflow-level max-step-size overrides plugin config', () => {
      let workflowRunFixture: WorkflowRunFixture;

      beforeAll(async () => {
        workflowRunFixture = new WorkflowRunFixture();
        // Plugin config: 1KB (would reject 5KB output)
        const limit1kb = new ByteSizeValue(1024);
        (workflowRunFixture.configMock as any).maxResponseSize = limit1kb;
        workflowRunFixture.dependencies.config.maxResponseSize = limit1kb;

        // But workflow-level settings allow 10KB
        const workflowYaml = `
settings:
  max-step-size: 10kb
steps:
  - name: large_step_workflow_override
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 5120
`;
        await workflowRunFixture.runWorkflow({ workflowYaml });
      });

      it('step succeeds because workflow-level limit (10kb) overrides plugin config (1kb)', () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
        expect(workflowExecutionDoc?.error).toBeUndefined();
      });
    });

    describe('step with on-failure continues workflow after size limit exceeded', () => {
      let workflowRunFixture: WorkflowRunFixture;

      beforeAll(async () => {
        workflowRunFixture = new WorkflowRunFixture();
        // Set a 1KB limit
        const limit1kb = new ByteSizeValue(1024);
        (workflowRunFixture.configMock as any).maxResponseSize = limit1kb;
        workflowRunFixture.dependencies.config.maxResponseSize = limit1kb;

        const workflowYaml = `
steps:
  - name: large_step_with_continue
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    on-failure:
      continue: true
    with:
      sizeBytes: 5120
  - name: next_step
    type: ${FakeConnectors.slack1.actionTypeId}
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'This should still run'
`;
        await workflowRunFixture.runWorkflow({ workflowYaml });
      });

      it('first step fails with size limit and second step still runs', () => {
        const stepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        );
        const largeStep = stepExecutions.find((s) => s.stepId === 'large_step_with_continue');
        const nextStep = stepExecutions.find((s) => s.stepId === 'next_step');

        expect(largeStep?.status).toBe(ExecutionStatus.FAILED);
        expect(largeStep?.error?.type).toBe('StepSizeLimitExceeded');

        // The next step should have executed (workflow continued via on-failure: continue)
        expect(nextStep).toBeDefined();
        expect(nextStep?.status).toBe(ExecutionStatus.COMPLETED);
      });
    });

    describe('data.set step with max-step-size', () => {
      let workflowRunFixture: WorkflowRunFixture;

      beforeAll(async () => {
        workflowRunFixture = new WorkflowRunFixture();
        const limit10kb = new ByteSizeValue(10 * 1024);
        (workflowRunFixture.configMock as any).maxResponseSize = limit10kb;
        workflowRunFixture.dependencies.config.maxResponseSize = limit10kb;

        const workflowYaml = `
steps:
  - name: generate_large_data
    type: data.set
    max-step-size: 10b
    with:
      some_key: "This string is definitely longer than 10 bytes"
`;
        await workflowRunFixture.runWorkflow({ workflowYaml });
      });

      it('data.set step fails when output exceeds step-level max-step-size', () => {
        const stepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        );
        const dataStep = stepExecutions.find((s) => s.stepId === 'generate_large_data');
        expect(dataStep?.status).toBe(ExecutionStatus.FAILED);
        expect(dataStep?.error?.type).toBe('StepSizeLimitExceeded');
      });
    });

    describe('stack connector (Slack-like) respects max-step-size', () => {
      let workflowRunFixture: WorkflowRunFixture;

      beforeAll(async () => {
        workflowRunFixture = new WorkflowRunFixture();
        const limit1kb = new ByteSizeValue(1024);
        (workflowRunFixture.configMock as any).maxResponseSize = limit1kb;
        workflowRunFixture.dependencies.config.maxResponseSize = limit1kb;

        // large_response connector returns 5KB -- exceeds 1KB limit
        const workflowYaml = `
steps:
  - name: slack_like_step
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 5120
`;
        await workflowRunFixture.runWorkflow({ workflowYaml });
      });

      it('connector step output caught by Layer 2 base class guard', () => {
        const stepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        );
        const connectorStep = stepExecutions.find((s) => s.stepId === 'slack_like_step');
        expect(connectorStep?.status).toBe(ExecutionStatus.FAILED);
        expect(connectorStep?.error?.type).toBe('StepSizeLimitExceeded');
      });
    });

    describe('input size check rejects oversized inputs before _run()', () => {
      let workflowRunFixture: WorkflowRunFixture;

      beforeAll(async () => {
        workflowRunFixture = new WorkflowRunFixture();
        const limit10kb = new ByteSizeValue(10 * 1024);
        (workflowRunFixture.configMock as any).maxResponseSize = limit10kb;
        workflowRunFixture.dependencies.config.maxResponseSize = limit10kb;

        // Step 1: generate large output (under 10kb limit)
        // Step 2: pass it as input to a step with 100b limit -- input check should fail
        const workflowYaml = `
steps:
  - name: generate_data
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 1024
  - name: receive_large_input
    type: data.set
    max-step-size: 100b
    with:
      big_ref: "{{ steps.generate_data.output | json }}"
`;
        await workflowRunFixture.runWorkflow({ workflowYaml });
      });

      it('step fails when rendered input exceeds max-step-size', () => {
        const stepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        );
        const inputStep = stepExecutions.find((s) => s.stepId === 'receive_large_input');
        expect(inputStep?.status).toBe(ExecutionStatus.FAILED);
        expect(inputStep?.error?.type).toBe('StepSizeLimitExceeded');
        expect(inputStep?.error?.message).toContain('input');
      });
    });
  });
});
