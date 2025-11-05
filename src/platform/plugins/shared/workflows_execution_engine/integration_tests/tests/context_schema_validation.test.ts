/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventSchema, ExecutionStatus, WorkflowContextSchema } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin.mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow context schema validation', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('event context with alerts', () => {
    const mockAlerts = [
      {
        _id: 'alert-1',
        _index: '.internal.alerts-test-default-000001',
        kibana: {
          alert: {
            uuid: 'alert-uuid-1',
            rule: {
              uuid: 'rule-uuid-1',
            },
          },
        },
        '@timestamp': '2025-11-04T12:00:00.000Z',
      },
      {
        _id: 'alert-2',
        _index: '.internal.alerts-test-default-000001',
        kibana: {
          alert: {
            uuid: 'alert-uuid-2',
            rule: {
              uuid: 'rule-uuid-1',
            },
          },
        },
        '@timestamp': '2025-11-04T12:01:00.000Z',
      },
    ];

    const mockEvent = {
      alerts: mockAlerts,
      rule: {
        id: 'rule-123',
        name: 'Test Rule',
        tags: ['tag1', 'tag2'],
        consumer: 'alerts',
        producer: 'stackAlerts',
        ruleTypeId: 'test.rule.type',
      },
      spaceId: 'default',
      params: {
        threshold: 100,
      },
    };

    beforeEach(async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: processAlerts
    type: ${FakeConnectors.slack1.actionTypeId}
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Processing {{event.alerts.length}} alerts from rule {{event.rule.name}}'
`,
        event: mockEvent,
      });
    });

    it('should successfully complete workflow with event context', () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecutionDoc?.error).toBe(undefined);
    });

    it('should have event context with alerts as an array', () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      const eventContext = workflowExecutionDoc?.context?.event;
      expect(eventContext).toBeDefined();
      expect(Array.isArray(eventContext?.alerts)).toBe(true);
      expect(eventContext?.alerts).toHaveLength(2);
    });

    it('should pass EventSchema validation', () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      const eventContext = workflowExecutionDoc?.context?.event;

      // Validate against EventSchema
      const validationResult = EventSchema.safeParse(eventContext);

      if (!validationResult.success) {
        // Fail with validation errors for debugging
        expect(validationResult.error.errors).toEqual([]);
      }

      expect(validationResult.success).toBe(true);
    });

    it('should NOT have alerts as an object with new/ongoing/recovered/all structure', () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      const eventContext = workflowExecutionDoc?.context?.event;

      // Ensure alerts is not the old structure
      expect(eventContext?.alerts).not.toHaveProperty('new');
      expect(eventContext?.alerts).not.toHaveProperty('ongoing');
      expect(eventContext?.alerts).not.toHaveProperty('recovered');
      expect(eventContext?.alerts).not.toHaveProperty('all');
    });

    it('should use event.alerts in template rendering', () => {
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: FakeConnectors.slack1.id,
          params: {
            message: 'Processing 2 alerts from rule Test Rule',
          },
        })
      );
    });
  });

  describe('full context schema validation', () => {
    beforeEach(async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: step1
    type: ${FakeConnectors.echo_inference.actionTypeId}
    connector-id: ${FakeConnectors.echo_inference.name}
    with:
      input: 'Test execution'
`,
        inputs: {
          testInput: 'test-value',
        },
        event: {
          alerts: [
            {
              _id: 'alert-1',
              _index: '.internal.alerts-test-default-000001',
              kibana: {
                alert: {
                  uuid: 'alert-uuid-1',
                },
              },
              '@timestamp': '2025-11-04T12:00:00.000Z',
            },
          ],
          rule: {
            id: 'rule-123',
            name: 'Test Rule',
            tags: [],
            consumer: 'alerts',
            producer: 'stackAlerts',
            ruleTypeId: 'test.rule.type',
          },
          spaceId: 'default',
          params: {},
        },
      });
    });

    it('should pass full WorkflowContextSchema validation', () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      // Build the context as the engine would
      const workflowContext = {
        event: workflowExecutionDoc?.context?.event,
        execution: {
          id: workflowExecutionDoc?.id,
          isTestRun: !!workflowExecutionDoc?.isTestRun,
          startedAt: new Date(workflowExecutionDoc?.startedAt || new Date()),
          url: 'http://localhost:5601/app/workflows/executions/fake_workflow_execution_id',
        },
        workflow: {
          id: workflowExecutionDoc?.workflowId,
          name: workflowExecutionDoc?.workflowDefinition.name,
          enabled: workflowExecutionDoc?.workflowDefinition.enabled,
          spaceId: workflowExecutionDoc?.spaceId,
        },
        kibanaUrl: 'http://localhost:5601',
        inputs: workflowExecutionDoc?.context?.inputs,
        consts: workflowExecutionDoc?.workflowDefinition.consts || {},
      };

      // Validate against WorkflowContextSchema
      const validationResult = WorkflowContextSchema.safeParse(workflowContext);

      if (!validationResult.success) {
        // Fail with validation errors for debugging
        expect(validationResult.error.errors).toEqual([]);
      }

      expect(validationResult.success).toBe(true);
    });
  });

  describe('event context without alerts', () => {
    beforeEach(async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: step1
    type: ${FakeConnectors.slack1.actionTypeId}
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'No alerts'
`,
        event: {
          alerts: [],
          rule: {
            id: 'rule-123',
            name: 'Test Rule',
            tags: [],
            consumer: 'alerts',
            producer: 'stackAlerts',
            ruleTypeId: 'test.rule.type',
          },
          spaceId: 'default',
          params: {},
        },
      });
    });

    it('should handle empty alerts array', () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      const eventContext = workflowExecutionDoc?.context?.event;
      expect(Array.isArray(eventContext?.alerts)).toBe(true);
      expect(eventContext?.alerts).toHaveLength(0);
    });

    it('should pass EventSchema validation with empty alerts', () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      const eventContext = workflowExecutionDoc?.context?.event;
      const validationResult = EventSchema.safeParse(eventContext);

      expect(validationResult.success).toBe(true);
    });
  });
});
