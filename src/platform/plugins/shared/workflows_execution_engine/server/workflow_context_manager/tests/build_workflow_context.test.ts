/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, ExecutionStatus, WorkflowYaml } from '@kbn/workflows';
import { mockContextDependencies } from '../../execution_functions/__mock__/context_dependencies';
import { buildWorkflowContext } from '../build_workflow_context';

jest.mock('../../utils', () => ({
  getKibanaUrl: jest.fn().mockReturnValue('http://localhost:5601'),
  buildWorkflowExecutionUrl: jest
    .fn()
    .mockImplementation((kibanaUrl, spaceId, workflowId, executionId) => {
      const spacePrefix = spaceId === 'default' ? '' : `/s/${spaceId}`;
      return `${kibanaUrl}${spacePrefix}/app/workflows/${workflowId}?executionId=${executionId}`;
    }),
}));

describe('buildWorkflowContext', () => {
  const dependencies = mockContextDependencies();
  const baseExecution: EsWorkflowExecution = {
    id: 'test-execution-id',
    workflowId: 'test-workflow-id',
    spaceId: 'default',
    isTestRun: false,
    status: 'running' as ExecutionStatus,
    context: {},
    workflowDefinition: {
      name: 'Test Workflow',
      version: '1',
      enabled: true,
      inputs: [] as any,
      consts: {},
      triggers: [],
      steps: [],
    },
    yaml: '',
    scopeStack: [],
    createdAt: '2023-01-01T00:00:00.000Z',
    startedAt: '2023-01-01T00:00:00.000Z',
    finishedAt: '2023-01-01T00:00:00.000Z',
    createdBy: 'test-user',
    duration: 0,
    error: null,
    cancelRequested: false,
  };

  describe('execution context', () => {
    it('should include executedBy and triggeredBy in execution context', () => {
      const execution: EsWorkflowExecution = {
        ...baseExecution,
        createdBy: 'user@example.com',
        executedBy: 'user@example.com',
        triggeredBy: 'manual',
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.execution.executedBy).toBe('user@example.com');
      expect(context.execution.triggeredBy).toBe('manual');
    });

    it('should default to unknown when executedBy is undefined', () => {
      const execution: EsWorkflowExecution = {
        ...baseExecution,
        createdBy: 'legacy-user',
        executedBy: undefined,
        triggeredBy: 'manual',
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.execution.executedBy).toBe('unknown');
      expect(context.execution.triggeredBy).toBe('manual');
    });

    it('should handle undefined executedBy and triggeredBy', () => {
      const execution: EsWorkflowExecution = {
        ...baseExecution,
        createdBy: 'system',
        executedBy: undefined,
        triggeredBy: undefined,
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.execution.executedBy).toBe('unknown');
      expect(context.execution.triggeredBy).toBeUndefined();
    });

    it('should include triggeredBy as scheduled for automated executions', () => {
      const execution: EsWorkflowExecution = {
        ...baseExecution,
        createdBy: 'system',
        executedBy: 'system',
        triggeredBy: 'scheduled',
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.execution.executedBy).toBe('system');
      expect(context.execution.triggeredBy).toBe('scheduled');
    });
  });

  describe('input default values', () => {
    it('should merge default input values when inputs are not provided', () => {
      const workflowDefinition: WorkflowYaml = {
        name: 'Merge inputs into ctx',
        version: '1',
        enabled: true,
        inputs: [
          {
            name: 'inputWithDefault',
            type: 'string',
            default: 'defaultValue',
          },
        ] as any,
        consts: {},
        triggers: [],
        steps: [],
      };

      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition,
        context: {
          inputs: {},
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.inputs).toEqual({
        inputWithDefault: 'defaultValue',
      });
    });

    it('should override default values with provided inputs', () => {
      const workflowDefinition: WorkflowYaml = {
        name: 'Merge inputs into ctx',
        version: '1',
        enabled: true,
        inputs: [
          {
            name: 'inputWithDefault',
            type: 'string',
            default: 'defaultValue',
          },
        ] as any,
        consts: {},
        triggers: [],
        steps: [],
      };

      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition,
        context: {
          inputs: {
            inputWithDefault: 'customValue',
          },
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.inputs).toEqual({
        inputWithDefault: 'customValue',
      });
    });

    it('should apply defaults for missing inputs while preserving provided ones', () => {
      const workflowDefinition: WorkflowYaml = {
        name: 'Merge inputs into ctx',
        version: '1',
        enabled: true,
        inputs: [
          {
            name: 'inputWithDefault',
            type: 'string',
            default: 'defaultValue',
          },
          {
            name: 'anotherInput',
            type: 'string',
            default: 'anotherDefault',
          },
        ] as any,
        consts: {},
        triggers: [],
        steps: [],
      };

      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition,
        context: {
          inputs: {
            inputWithDefault: 'customValue',
            // anotherInput is not provided, should use default
          },
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.inputs).toEqual({
        inputWithDefault: 'customValue',
        anotherInput: 'anotherDefault',
      });
    });

    it('should handle workflows without input defaults', () => {
      const workflowDefinition: WorkflowYaml = {
        name: 'Merge inputs into ctx',
        version: '1',
        enabled: true,
        inputs: [
          {
            name: 'inputWithDefault',
            type: 'string',
            // no default value
          },
        ] as any,
        consts: {},
        triggers: [],
        steps: [],
      };

      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition,
        context: {
          inputs: {
            inputWithDefault: 'providedValue',
          },
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.inputs).toEqual({
        inputWithDefault: 'providedValue',
      });
    });

    it('should return undefined inputs when there are no defaults and no provided inputs (backwards compatible)', () => {
      const workflowDefinition: WorkflowYaml = {
        name: 'Merge inputs into ctx',
        version: '1',
        enabled: true,
        inputs: [
          {
            name: 'inputWithDefault',
            type: 'string',
            // no default value
          },
        ] as any,
        consts: {},
        triggers: [],
        steps: [],
      };

      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition,
        context: {
          // inputs is undefined
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      // Backwards compatible: should return undefined when no defaults and no provided inputs
      expect(context.inputs).toBeUndefined();
    });

    it('should handle empty inputs context', () => {
      const workflowDefinition: WorkflowYaml = {
        name: 'Merge inputs into ctx',
        version: '1',
        enabled: true,
        inputs: [
          {
            name: 'inputWithDefault',
            type: 'string',
            default: 'defaultValue',
          },
        ] as any,
        consts: {},
        triggers: [],
        steps: [],
      };

      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition,
        context: {
          // inputs is undefined
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.inputs).toEqual({
        inputWithDefault: 'defaultValue',
      });
    });

    it('should handle different input types with defaults', () => {
      const workflowDefinition: WorkflowYaml = {
        name: 'Test Workflow',
        version: '1',
        enabled: true,
        inputs: [
          {
            name: 'count',
            type: 'number',
            required: false,
            default: 42,
          },
          {
            name: 'enabled',
            type: 'boolean',
            required: false,
            default: true,
          },
          {
            name: 'tags',
            type: 'array',
            required: false,
            default: ['tag1', 'tag2'],
          },
        ] as any,
        consts: {},
        triggers: [],
        steps: [],
      };

      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition,
        context: {
          inputs: {},
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.inputs).toEqual({
        count: 42,
        enabled: true,
        tags: ['tag1', 'tag2'],
      });
    });

    it('should handle empty provided inputs object (not undefined)', () => {
      const workflowDefinition: WorkflowYaml = {
        name: 'Merge inputs into ctx',
        version: '1',
        enabled: true,
        inputs: [
          {
            name: 'inputWithDefault',
            type: 'string',
            default: 'defaultValue',
          },
        ] as any,
        consts: {},
        triggers: [],
        steps: [],
      };

      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition,
        context: {
          inputs: {}, // Empty object, not undefined
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      // Should still apply defaults when providedInputs is empty object
      expect(context.inputs).toEqual({
        inputWithDefault: 'defaultValue',
      });
    });

    it('should handle workflow definition with undefined name and enabled', () => {
      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition: {
          name: undefined as any,
          version: '1',
          enabled: undefined as any,
          inputs: [] as any,
          consts: {},
          triggers: [],
          steps: [],
        },
        context: {},
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      // Should use default values for undefined name and enabled
      expect(context.workflow.name).toBe('');
      expect(context.workflow.enabled).toBe(false);
    });

    it('should handle workflow definition with undefined consts', () => {
      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition: {
          name: 'Test Workflow',
          version: '1',
          enabled: true,
          inputs: [] as any,
          consts: undefined as any,
          triggers: [],
          steps: [],
        },
        context: {},
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      // Should use empty object for undefined consts
      expect(context.consts).toEqual({});
    });
  });

  describe('event context shape', () => {
    it('should pass through event with spaceId for manual trigger executions', () => {
      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition: {
          ...baseExecution.workflowDefinition,
          triggers: [{ type: 'manual' }],
        },
        context: {
          event: {
            spaceId: 'default',
          },
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.event).toBeDefined();
      expect(context.event?.spaceId).toBe('default');
      // Manual trigger should not have alert-specific properties
      expect(context.event).not.toHaveProperty('alerts');
      expect(context.event).not.toHaveProperty('rule');
    });

    it('should pass through event with alerts, rule, and spaceId for alert trigger executions', () => {
      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition: {
          ...baseExecution.workflowDefinition,
          triggers: [{ type: 'alert' }],
        },
        context: {
          event: {
            spaceId: 'default',
            alerts: [
              {
                _id: 'alert-1',
                _index: '.alerts-default',
                kibana: { alert: { status: 'active' } },
                '@timestamp': '2026-02-17T00:00:00.000Z',
              },
            ],
            rule: {
              id: 'rule-1',
              name: 'Test Rule',
              tags: ['security'],
              consumer: 'siem',
              producer: 'siem',
              ruleTypeId: 'siem.queryRule',
            },
            params: { threshold: 10 },
          },
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.event).toBeDefined();
      expect(context.event?.spaceId).toBe('default');
      expect(context.event?.alerts).toHaveLength(1);
      expect(context.event?.alerts?.[0]._id).toBe('alert-1');
      expect(context.event?.rule?.name).toBe('Test Rule');
      expect(context.event?.params).toEqual({ threshold: 10 });
    });

    it('should handle undefined event context gracefully', () => {
      const execution: EsWorkflowExecution = {
        ...baseExecution,
        context: {},
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      expect(context.event).toBeUndefined();
    });

    it('should handle when workflowInputs parameter is undefined (uses default)', () => {
      const execution: EsWorkflowExecution = {
        ...baseExecution,
        workflowDefinition: {
          name: 'Test Workflow',
          version: '1',
          enabled: true,
          inputs: undefined as any,
          consts: {},
          triggers: [],
          steps: [],
        },
        context: {
          inputs: {
            customInput: 'value',
          },
        },
      };

      const context = buildWorkflowContext(execution, undefined, dependencies);

      // Should handle undefined inputs array (uses default empty array)
      expect(context.inputs).toEqual({
        customInput: 'value',
      });
    });
  });
});
