/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution, WorkflowExecutionDto } from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import {
  buildContextOverride,
  buildContextOverrideFromExecution,
} from './build_step_context_override';
import { INPUT_STRING_PLACEHOLDER } from '../../../../common/consts/placeholders';

describe('buildContextOverride', () => {
  const mockStaticData = {
    workflow: {
      id: 'test-workflow-id',
      name: 'test-workflow',
      enabled: true,
      spaceId: 'default',
    },
    consts: {},
  };

  describe('with simple workflow', () => {
    it('should return empty context when no inputs are found in graph', () => {
      const simpleWorkflow = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'simple_step',
            type: 'console.log',
            with: {
              message: 'Hello, world!',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(simpleWorkflow);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({});
      expect(result.schema).toBeDefined();
    });

    it('should build context for step references', () => {
      const workflowWithStepReferences = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'first_step',
            type: 'console.log',
            with: {
              message: 'Hello',
            },
          },
          {
            name: 'second_step',
            type: 'console.log',
            with: {
              message: '{{ steps.first_step.output.result }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithStepReferences);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          first_step: {
            output: {
              result: INPUT_STRING_PLACEHOLDER,
            },
          },
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should build context for nested step output references', () => {
      const workflowWithNestedReferences = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'data_step',
            type: 'data.processor',
            with: {
              query: 'SELECT * FROM table',
            },
          },
          {
            name: 'process_step',
            type: 'console.log',
            with: {
              message: '{{ steps.data_step.output.data.rows[0].name }}',
              count: '{{ steps.data_step.output.meta.total }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithNestedReferences);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          data_step: {
            output: {
              data: {
                rows: {
                  '0': {
                    name: INPUT_STRING_PLACEHOLDER,
                  },
                },
              },
              meta: {
                total: INPUT_STRING_PLACEHOLDER,
              },
            },
          },
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should build context for foreach references', () => {
      const workflowWithForeach = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'foreach_step',
            type: 'foreach',
            foreach: '{{ steps.data_step.output.items }}',
            steps: [
              {
                name: 'process_item',
                type: 'console.log',
                with: {
                  message: '{{ foreach.item.name }}',
                  index: '{{ foreach.index }}',
                  total: '{{ foreach.total }}',
                },
              },
            ],
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithForeach);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      // The foreach step should extract inputs from the template expression
      expect(result.stepContext).toEqual({
        steps: {
          data_step: {
            output: {
              items: INPUT_STRING_PLACEHOLDER,
            },
          },
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should build context for foreach variables when used in non-foreach steps', () => {
      const workflowWithForeachUsage = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'simple_step',
            type: 'console.log',
            with: {
              message: '{{ foreach.item.name }}',
              index: '{{ foreach.index }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithForeachUsage);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        foreach: {
          item: {
            name: INPUT_STRING_PLACEHOLDER,
          },
          index: INPUT_STRING_PLACEHOLDER,
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should build context for workflow execution references', () => {
      const workflowWithExecutionRefs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'execution_step',
            type: 'console.log',
            with: {
              workflowId: '{{ execution.workflow.id }}',
              executionId: '{{ execution.id }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithExecutionRefs);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        execution: {
          workflow: {
            id: INPUT_STRING_PLACEHOLDER,
          },
          id: INPUT_STRING_PLACEHOLDER,
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should build context for mixed references', () => {
      const workflowWithMixedRefs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'mixed_step',
            type: 'console.log',
            with: {
              stepOutput: '{{ steps.previous_step.output.data }}',
              workflowName: '{{ workflow.name }}',
              eventData: '{{ event.payload.user.id }}',
              inputValue: '{{ inputs.userInput }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithMixedRefs);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          previous_step: {
            output: {
              data: INPUT_STRING_PLACEHOLDER,
            },
          },
        },
        workflow: {
          name: 'test-workflow',
        },
        event: {
          payload: {
            user: {
              id: INPUT_STRING_PLACEHOLDER,
            },
          },
        },
        inputs: {
          userInput: INPUT_STRING_PLACEHOLDER,
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should use input default values when inputsDefinition is provided', () => {
      const workflowWithInputs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              message: '{{ inputs.message }}',
              count: '{{ inputs.count }}',
              flag: '{{ inputs.flag }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithInputs);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: [
          { name: 'message', type: 'string' as const, default: 'hello world' },
          { name: 'count', type: 'number' as const, default: 42 },
          { name: 'flag', type: 'boolean' as const, default: true },
        ],
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      expect(result.stepContext).toEqual({
        inputs: {
          message: 'hello world',
          count: 42,
          flag: true,
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should fall back to placeholder for inputs without defaults', () => {
      const workflowWithInputs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              messageWithDefault: '{{ inputs.messageWithDefault }}',
              messageWithoutDefault: '{{ inputs.messageWithoutDefault }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithInputs);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: [
          { name: 'messageWithDefault', type: 'string' as const, default: 'default value' },
          { name: 'messageWithoutDefault', type: 'string' as const },
        ],
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      expect(result.stepContext).toEqual({
        inputs: {
          messageWithDefault: 'default value',
          messageWithoutDefault: INPUT_STRING_PLACEHOLDER,
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should handle array input defaults', () => {
      const workflowWithArrayInput = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              tags: '{{ inputs.tags }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithArrayInput);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: [
          { name: 'tags', type: 'array' as const, default: ['tag1', 'tag2', 'tag3'] },
        ],
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      expect(result.stepContext).toEqual({
        inputs: {
          tags: ['tag1', 'tag2', 'tag3'],
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should handle choice input defaults', () => {
      const workflowWithChoiceInput = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              priority: '{{ inputs.priority }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithChoiceInput);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: [
          {
            name: 'priority',
            type: 'choice' as const,
            options: ['low', 'medium', 'high'],
            default: 'medium',
          },
        ],
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      expect(result.stepContext).toEqual({
        inputs: {
          priority: 'medium',
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should use input default values when inputsDefinition is provided in JSON Schema format', () => {
      const workflowWithInputs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              message: '{{ inputs.message }}',
              count: '{{ inputs.count }}',
              flag: '{{ inputs.flag }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithInputs);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: {
          properties: {
            message: {
              type: 'string',
              default: 'hello world',
            },
            count: {
              type: 'number',
              default: 42,
            },
            flag: {
              type: 'boolean',
              default: true,
            },
          },
          additionalProperties: false,
        } satisfies JsonModelSchemaType,
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      expect(result.stepContext).toEqual({
        inputs: {
          message: 'hello world',
          count: 42,
          flag: true,
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should fall back to placeholder for JSON Schema inputs without defaults', () => {
      const workflowWithInputs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              messageWithDefault: '{{ inputs.messageWithDefault }}',
              messageWithoutDefault: '{{ inputs.messageWithoutDefault }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithInputs);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: {
          properties: {
            messageWithDefault: {
              type: 'string',
              default: 'default value',
            },
            messageWithoutDefault: {
              type: 'string',
            },
          },
          additionalProperties: false,
        } satisfies JsonModelSchemaType,
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      expect(result.stepContext).toEqual({
        inputs: {
          messageWithDefault: 'default value',
          messageWithoutDefault: INPUT_STRING_PLACEHOLDER,
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should handle nested object defaults in JSON Schema format', () => {
      const workflowWithNestedInputs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              userName: '{{ inputs.user.name }}',
              userEmail: '{{ inputs.user.email }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithNestedInputs);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: {
          properties: {
            user: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  default: 'John Doe',
                },
                email: {
                  type: 'string',
                  default: 'john@example.com',
                },
              },
              required: ['name', 'email'],
              additionalProperties: false,
            },
          },
          required: ['user'],
          additionalProperties: false,
        } satisfies JsonModelSchemaType,
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      // Nested object defaults are now extracted using applyInputDefaults (same as exec modal)
      expect(result.stepContext).toEqual({
        inputs: {
          user: {
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      });
      expect(result.schema).toBeDefined();
    });
  });

  describe('schema generation', () => {
    it('should generate a valid zod schema that validates the mock data', () => {
      const workflow = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'test_step',
            type: 'console.log',
            with: {
              message: '{{ steps.previous.output.result }}',
              count: '{{ workflow.id }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      // The schema should successfully parse the mock data
      expect(() => result.schema.parse(result.stepContext)).not.toThrow();
    });

    it('should generate schema for array structures', () => {
      const workflow = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'array_step',
            type: 'console.log',
            with: {
              firstItem: '{{ steps.data.output.items[0].name }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          data: {
            output: {
              items: {
                '0': {
                  name: INPUT_STRING_PLACEHOLDER,
                },
              },
            },
          },
        },
      });

      // Verify the schema accepts the mock data
      expect(() => result.schema.parse(result.stepContext)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty workflow gracefully', () => {
      const emptyWorkflow = {
        version: '1' as const,
        name: 'empty-workflow',
        enabled: true,
        triggers: [],
        steps: [],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(emptyWorkflow);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({});
      expect(result.schema).toBeDefined();
      expect(() => result.schema.parse(result.stepContext)).not.toThrow();
    });

    it('should handle duplicate step references', () => {
      const workflowWithDuplicates = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'duplicate_refs',
            type: 'console.log',
            with: {
              message1: '{{ steps.source.output.data }}',
              message2: '{{ steps.source.output.data }}',
              message3: '{{ steps.source.output.meta }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithDuplicates);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          source: {
            output: {
              data: INPUT_STRING_PLACEHOLDER,
              meta: INPUT_STRING_PLACEHOLDER,
            },
          },
        },
      });
    });

    it('should handle deeply nested property paths', () => {
      const workflowWithDeepNesting = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'deep_step',
            type: 'console.log',
            with: {
              value: '{{ steps.api.output.response.data.user.profile.settings.theme }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithDeepNesting);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          api: {
            output: {
              response: {
                data: {
                  user: {
                    profile: {
                      settings: {
                        theme: INPUT_STRING_PLACEHOLDER,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should handle multiple array indices', () => {
      const workflowWithMultipleArrays = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'array_step',
            type: 'console.log',
            with: {
              value1: '{{ steps.data.output.matrix[0][1].value }}',
              value2: '{{ steps.data.output.list[5].name }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithMultipleArrays);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          data: {
            output: {
              matrix: {
                '0': {
                  '1': {
                    value: INPUT_STRING_PLACEHOLDER,
                  },
                },
              },
              list: {
                '5': {
                  name: INPUT_STRING_PLACEHOLDER,
                },
              },
            },
          },
        },
      });
    });

    it('should handle complex property access with mixed notation', () => {
      const workflowWithMixedNotation = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'mixed_notation_step',
            type: 'console.log',
            with: {
              value: "{{ steps.api.output.data['user-info'][0].profile.name }}",
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithMixedNotation);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          api: {
            output: {
              data: {
                'user-info': {
                  '0': {
                    profile: {
                      name: INPUT_STRING_PLACEHOLDER,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });
  });
});

describe('buildContextOverrideFromExecution', () => {
  const createWorkflowExecution = (
    overrides: Partial<WorkflowExecutionDto> & {
      stepExecutions: WorkflowExecutionDto['stepExecutions'];
    }
  ): WorkflowExecutionDto =>
    ({
      id: 'exec-1',
      spaceId: 'default',
      status: 'completed',
      isTestRun: true,
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:01Z',
      error: null,
      workflowId: 'wf-1',
      workflowDefinition: { version: '1', name: 'test', enabled: true, triggers: [], steps: [] },
      duration: 1000,
      yaml: '',
      context: {},
      ...overrides,
    } as WorkflowExecutionDto);

  const createStepExecution = (
    overrides: Partial<EsWorkflowStepExecution>
  ): EsWorkflowStepExecution =>
    ({
      id: 'step-exec-1',
      stepId: 'step1',
      stepType: 'console',
      scopeStack: [],
      workflowRunId: 'exec-1',
      workflowId: 'wf-1',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:01Z',
      topologicalIndex: 1,
      globalExecutionIndex: 0,
      stepExecutionIndex: 0,
      ...overrides,
    } as EsWorkflowStepExecution);

  it('should resolve inputs.* from workflow execution context', () => {
    const workflow = {
      version: '1' as const,
      name: 'test',
      enabled: true,
      triggers: [{ type: 'manual' as const, enabled: true }],
      steps: [
        {
          name: 'log_step',
          type: 'console' as const,
          with: { message: '{{ inputs.foo }}' },
        },
      ],
    };
    const graph = WorkflowGraph.fromWorkflowDefinition(workflow).getStepGraph('log_step');
    const workflowExecution = createWorkflowExecution({
      context: { inputs: { foo: 'hello world' } },
      stepExecutions: [],
    });
    const targetStep = createStepExecution({ stepId: 'log_step', globalExecutionIndex: 0 });

    const result = buildContextOverrideFromExecution(graph, workflowExecution, targetStep);

    expect(result.stepContext).toEqual({
      inputs: { foo: 'hello world' },
    });
    expect(result.schema).toBeDefined();
  });

  it('should use context.contextOverride when present (e.g. from a past test step run)', () => {
    const workflow = {
      version: '1' as const,
      name: 'test',
      enabled: true,
      triggers: [{ type: 'manual' as const, enabled: true }],
      steps: [
        {
          name: 'log_step',
          type: 'console' as const,
          with: {
            message: '{{ inputs.foo }}',
            extra: '{{ inputs.extra }}',
          },
        },
      ],
    };
    const graph = WorkflowGraph.fromWorkflowDefinition(workflow).getStepGraph('log_step');
    const workflowExecution = createWorkflowExecution({
      context: {
        inputs: { foo: 'from-context' },
        contextOverride: {
          inputs: { foo: 'from-override', extra: 'from-override' },
        },
      },
      stepExecutions: [],
    });
    const targetStep = createStepExecution({ stepId: 'log_step', globalExecutionIndex: 0 });

    const result = buildContextOverrideFromExecution(graph, workflowExecution, targetStep);

    expect(result.stepContext).toEqual({
      inputs: {
        foo: 'from-override',
        extra: 'from-override',
      },
    });
  });

  it('should resolve steps.X.output from sibling step executions', () => {
    const workflow = {
      version: '1' as const,
      name: 'test',
      enabled: true,
      triggers: [{ type: 'manual' as const, enabled: true }],
      steps: [
        { name: 'first', type: 'console' as const, with: { message: 'Hi' } },
        {
          name: 'second',
          type: 'console' as const,
          with: { message: '{{ steps.first.output }}' },
        },
      ],
    };
    const graph = WorkflowGraph.fromWorkflowDefinition(workflow).getStepGraph('second');
    const workflowExecution = createWorkflowExecution({
      context: {},
      stepExecutions: [
        createStepExecution({
          stepId: 'first',
          globalExecutionIndex: 0,
          output: 'Hello from first',
        }),
        createStepExecution({
          stepId: 'second',
          globalExecutionIndex: 1,
        }),
      ],
    });
    const targetStep = createStepExecution({ stepId: 'second', globalExecutionIndex: 1 });

    const result = buildContextOverrideFromExecution(graph, workflowExecution, targetStep);

    expect(result.stepContext).toEqual({
      steps: {
        first: {
          output: 'Hello from first',
        },
      },
    });
  });

  it('should resolve workflow.* and execution.* from context', () => {
    const workflow = {
      version: '1' as const,
      name: 'test',
      enabled: true,
      triggers: [{ type: 'manual' as const, enabled: true }],
      steps: [
        {
          name: 'meta_step',
          type: 'console' as const,
          with: {
            wfName: '{{ workflow.name }}',
            execId: '{{ execution.id }}',
          },
        },
      ],
    };
    const graph = WorkflowGraph.fromWorkflowDefinition(workflow).getStepGraph('meta_step');
    const workflowExecution = createWorkflowExecution({
      context: {
        workflow: { id: 'wf-1', name: 'My Workflow', enabled: true, spaceId: 'default' },
        execution: { id: 'exec-123', isTestRun: true },
      },
      stepExecutions: [],
    });
    const targetStep = createStepExecution({ stepId: 'meta_step', globalExecutionIndex: 0 });

    const result = buildContextOverrideFromExecution(graph, workflowExecution, targetStep);

    expect(result.stepContext).toEqual({
      workflow: { name: 'My Workflow' },
      execution: { id: 'exec-123' },
    });
  });

  it('should fall back to placeholder when value is missing', () => {
    const workflow = {
      version: '1' as const,
      name: 'test',
      enabled: true,
      triggers: [{ type: 'manual' as const, enabled: true }],
      steps: [
        {
          name: 'step',
          type: 'console' as const,
          with: {
            fromInput: '{{ inputs.missing }}',
            fromStep: '{{ steps.nonexistent.output }}',
          },
        },
      ],
    };
    const graph = WorkflowGraph.fromWorkflowDefinition(workflow).getStepGraph('step');
    const workflowExecution = createWorkflowExecution({ context: {}, stepExecutions: [] });
    const targetStep = createStepExecution({ stepId: 'step', globalExecutionIndex: 0 });

    const result = buildContextOverrideFromExecution(graph, workflowExecution, targetStep);

    expect(result.stepContext).toEqual({
      inputs: { missing: INPUT_STRING_PLACEHOLDER },
      steps: {
        nonexistent: {
          output: INPUT_STRING_PLACEHOLDER,
        },
      },
    });
  });

  it('should use latest predecessor step execution when step runs multiple times (e.g. in loop)', () => {
    const workflow = {
      version: '1' as const,
      name: 'test',
      enabled: true,
      triggers: [{ type: 'manual' as const, enabled: true }],
      steps: [
        { name: 'loop', type: 'foreach' as const, foreach: [1, 2, 3], steps: [] },
        {
          name: 'consumer',
          type: 'console' as const,
          with: { value: '{{ steps.loop.output }}' },
        },
      ],
    };
    const graph = WorkflowGraph.fromWorkflowDefinition(workflow).getStepGraph('consumer');
    const workflowExecution = createWorkflowExecution({
      context: {},
      stepExecutions: [
        createStepExecution({ stepId: 'loop', globalExecutionIndex: 0, output: 'first' }),
        createStepExecution({ stepId: 'consumer', globalExecutionIndex: 1 }),
      ],
    });
    const targetStep = createStepExecution({ stepId: 'consumer', globalExecutionIndex: 1 });

    const result = buildContextOverrideFromExecution(graph, workflowExecution, targetStep);

    expect(result.stepContext).toEqual({
      steps: { loop: { output: 'first' } },
    });
  });

  it('should reconstruct foreach context from scopeStack and foreach step execution', () => {
    const workflow = {
      version: '1' as const,
      name: 'test',
      enabled: true,
      triggers: [{ type: 'manual' as const, enabled: true }],
      steps: [
        {
          name: 'loop',
          type: 'foreach' as const,
          foreach: [10, 20, 30],
          steps: [
            {
              name: 'inner',
              type: 'console' as const,
              with: {
                item: '{{ foreach.item }}',
                index: '{{ foreach.index }}',
                total: '{{ foreach.total }}',
              },
            },
          ],
        },
      ],
    };
    const graph = WorkflowGraph.fromWorkflowDefinition(workflow).getStepGraph('inner');
    const workflowExecution = createWorkflowExecution({
      context: {},
      stepExecutions: [
        createStepExecution({
          stepId: 'loop',
          stepType: 'foreach',
          globalExecutionIndex: 0,
          input: { foreach: [10, 20, 30] },
          state: { index: 1, total: 3 },
        }),
        createStepExecution({
          stepId: 'inner',
          globalExecutionIndex: 1,
          scopeStack: [
            {
              stepId: 'loop',
              nestedScopes: [
                { nodeId: 'enterForeach_loop', nodeType: 'enter-foreach', scopeId: '1' },
              ],
            },
          ],
        }),
      ],
    });
    const targetStep = createStepExecution({
      stepId: 'inner',
      globalExecutionIndex: 1,
      scopeStack: [
        {
          stepId: 'loop',
          nestedScopes: [{ nodeId: 'enterForeach_loop', nodeType: 'enter-foreach', scopeId: '1' }],
        },
      ],
    });

    const result = buildContextOverrideFromExecution(graph, workflowExecution, targetStep);

    expect(result.stepContext).toEqual({
      foreach: {
        item: 20,
        index: 1,
        total: 3,
      },
    });
  });

  it('should return a schema that validates the stepContext', () => {
    const workflow = {
      version: '1' as const,
      name: 'test',
      enabled: true,
      triggers: [{ type: 'manual' as const, enabled: true }],
      steps: [
        {
          name: 'step',
          type: 'console' as const,
          with: { message: '{{ inputs.foo }}' },
        },
      ],
    };
    const graph = WorkflowGraph.fromWorkflowDefinition(workflow).getStepGraph('step');
    const workflowExecution = createWorkflowExecution({
      context: { inputs: { foo: 'bar' } },
      stepExecutions: [],
    });
    const targetStep = createStepExecution({ stepId: 'step', globalExecutionIndex: 0 });

    const result = buildContextOverrideFromExecution(graph, workflowExecution, targetStep);

    expect(() => result.schema.parse(result.stepContext)).not.toThrow();
  });
});
